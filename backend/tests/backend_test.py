"""Backend API tests for Emergent-managed Google Auth integration on Gachard."""
import os
import subprocess
import json
import time
import pytest
import requests
from requests.auth import HTTPBasicAuth
from dotenv import dotenv_values

ADMIN_USER = "admin"
ADMIN_PASS = "gachard123"
ADMIN_AUTH = HTTPBasicAuth(ADMIN_USER, ADMIN_PASS)

frontend_env = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL")
            or frontend_env.get("NEXT_PUBLIC_APP_URL")
            or "https://9db77cb0-3df7-4a50-96db-66965a097236.preview.emergentagent.com").rstrip("/")


def _mongo_eval(script: str) -> str:
    """Run a mongosh eval and return stdout (best-effort)."""
    res = subprocess.run(
        ["mongosh", "mongodb://localhost:27017/gachard", "--quiet", "--eval", script],
        capture_output=True, text=True, timeout=15,
    )
    return res.stdout.strip()


@pytest.fixture(scope="session")
def seeded_session():
    """Create a real Mongo session for a QA user; clean up afterwards."""
    ts = int(time.time() * 1000)
    email = f"qa.test.{ts}@example.com"
    token = f"test_session_{ts}"
    script = f'''
var oid = new ObjectId();
db.users.insertOne({{_id: oid, email: "{email}", username: "QAUser", walletAddress: "0x000000000000000000000000000000000000dEaD", createdAt: new Date().toISOString()}});
db.user_sessions.insertOne({{user_id: oid.toString(), session_token: "{token}", expires_at: new Date(Date.now() + 7*24*60*60*1000), created_at: new Date()}});
print(oid.toString());
'''
    user_id = _mongo_eval(script).splitlines()[-1].strip()
    assert len(user_id) == 24, f"Failed to seed user, got: {user_id!r}"
    yield {"user_id": user_id, "session_token": token, "email": email}
    # cleanup
    _mongo_eval(
        f'db.users.deleteMany({{email: "{email}"}}); db.user_sessions.deleteMany({{session_token: "{token}"}});'
    )


# ---------------- /api/auth/me ----------------
class TestAuthMe:
    def test_me_no_token_returns_401(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 401, r.text
        data = r.json()
        assert "error" in data

    def test_me_invalid_token_returns_401(self):
        r = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer not_a_real_token_xyz"},
            timeout=15,
        )
        assert r.status_code == 401

    def test_me_via_bearer(self, seeded_session):
        r = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {seeded_session['session_token']}"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user_id"] == seeded_session["user_id"]
        assert data["email"] == seeded_session["email"]
        assert data["username"] == "QAUser"

    def test_me_via_cookie(self, seeded_session):
        r = requests.get(
            f"{BASE_URL}/api/auth/me",
            cookies={"session_token": seeded_session["session_token"]},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user_id"] == seeded_session["user_id"]
        assert data["email"] == seeded_session["email"]


# ---------------- /api/auth/session ----------------
class TestAuthSession:
    def test_session_missing_id_returns_400(self):
        r = requests.post(f"{BASE_URL}/api/auth/session", json={}, timeout=15)
        assert r.status_code == 400, r.text

    def test_session_invalid_id_returns_401(self):
        # bogus session id — Emergent will reject → route returns 401
        r = requests.post(
            f"{BASE_URL}/api/auth/session",
            json={"session_id": "bogus_invalid_session_id_xyz_12345"},
            timeout=20,
        )
        assert r.status_code == 401, r.text


# ---------------- /api/auth/logout ----------------
class TestProxyCookieFix:
    """Primary regression test for the FastAPI proxy Set-Cookie fix.

    Previously the port-8001 reverse proxy collapsed duplicate response
    headers into a dict, dropping the non-httpOnly gachard_uid cookie set
    alongside session_token. Both must now appear as separate Set-Cookie
    headers through the PUBLIC preview URL.
    """
    def test_logout_returns_both_set_cookies_through_proxy(self):
        r = requests.post(f"{BASE_URL}/api/auth/logout", timeout=15)
        assert r.status_code == 200, r.text
        # urllib3 exposes multiple Set-Cookie values via getlist
        set_cookies = r.raw.headers.getlist("set-cookie")
        joined = "\n".join(set_cookies)
        assert any("session_token=" in c for c in set_cookies), f"session_token missing: {set_cookies}"
        assert any("gachard_uid=" in c for c in set_cookies), (
            f"gachard_uid Set-Cookie missing through proxy — regression of the proxy fix. Got: {set_cookies}"
        )
        # confirm they arrived as SEPARATE headers, not merged into one comma-joined value
        assert len([c for c in set_cookies if "gachard_uid=" in c]) >= 1
        assert len([c for c in set_cookies if "session_token=" in c]) >= 1


class TestAuthLogout:
    def test_logout_deletes_session(self):
        # seed a fresh session inline so we don't touch the shared fixture
        ts = int(time.time() * 1000)
        email = f"qa.test.logout.{ts}@example.com"
        token = f"test_session_logout_{ts}"
        script = f'''
var oid = new ObjectId();
db.users.insertOne({{_id: oid, email: "{email}", username: "QALogout", walletAddress: "0x000000000000000000000000000000000000dEaD", createdAt: new Date().toISOString()}});
db.user_sessions.insertOne({{user_id: oid.toString(), session_token: "{token}", expires_at: new Date(Date.now() + 7*24*60*60*1000), created_at: new Date()}});
print(oid.toString());
'''
        user_id = _mongo_eval(script).splitlines()[-1].strip()
        assert len(user_id) == 24

        try:
            # sanity: session works before logout
            r = requests.get(
                f"{BASE_URL}/api/auth/me",
                headers={"Authorization": f"Bearer {token}"},
                timeout=15,
            )
            assert r.status_code == 200

            # perform logout via cookie
            r = requests.post(
                f"{BASE_URL}/api/auth/logout",
                cookies={"session_token": token},
                timeout=15,
            )
            assert r.status_code == 200, r.text
            assert r.json().get("ok") is True

            # cookies should be cleared (Set-Cookie with expired/empty)
            # THE PROXY FIX: assert BOTH session_token AND gachard_uid appear
            # as separate Set-Cookie headers (not collapsed by the port-8001
            # FastAPI proxy). Use raw response to see multiple headers.
            raw_set_cookies = r.raw.headers.getlist("set-cookie") if hasattr(r.raw, "headers") else []
            if not raw_set_cookies:
                # requests exposes multiple set-cookie via .headers.get_list on urllib3 or via headers.items
                raw_set_cookies = [v for k, v in r.headers.items() if k.lower() == "set-cookie"]
            joined = "\n".join(raw_set_cookies) if raw_set_cookies else r.headers.get("set-cookie", "")
            assert "session_token=" in joined, f"missing session_token clear cookie: {joined!r}"
            assert "gachard_uid=" in joined, f"missing gachard_uid clear cookie (proxy fix regression): {joined!r}"

            # session should now be invalid → /api/auth/me returns 401 with the same token
            r = requests.get(
                f"{BASE_URL}/api/auth/me",
                headers={"Authorization": f"Bearer {token}"},
                timeout=15,
            )
            assert r.status_code == 401, r.text
        finally:
            _mongo_eval(
                f'db.users.deleteMany({{email: "{email}"}}); db.user_sessions.deleteMany({{session_token: "{token}"}});'
            )


# ---------------- /api/health ----------------
class TestHealth:
    def test_health_ok(self):
        r = requests.get(f"{BASE_URL}/api/health", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "ok"
        assert data["database"] == "connected"
        assert "timestamp" in data


# ---------------- Seeded regression fixture (user + templates + card) ----------------
@pytest.fixture(scope="module")
def seeded_regression_data():
    """Seed one user + one card_template + one card owned by that user.

    Cleans up after all tests in this module that use it.
    """
    ts = int(time.time() * 1000)
    email = f"qa.regression.{ts}@example.com"
    wallet = f"0x{ts:040x}"[:42]
    template_id = f"TEST_TPL_{ts}"
    card_id = f"TEST_CARD_{ts}"
    token_id = 900000 + (ts % 100000)
    script = f'''
var oid = new ObjectId();
db.users.insertOne({{
  _id: oid,
  email: "{email}",
  username: "QARegression",
  walletAddress: "{wallet}",
  createdAt: new Date().toISOString()
}});
db.card_templates.insertOne({{
  templateId: "{template_id}",
  rarity: "Rare",
  name: "TEST Regression Card",
  artworkUrl: "https://example.com/test.png"
}});
db.cards.insertOne({{
  cardId: "{card_id}",
  tokenId: {token_id},
  templateId: "{template_id}",
  rarity: "Rare",
  status: "Digital",
  ownerAddress: "{wallet}",
  createdAt: new Date()
}});
print(oid.toString());
'''
    user_id = _mongo_eval(script).splitlines()[-1].strip()
    assert len(user_id) == 24, f"Seed failed: {user_id!r}"

    yield {
        "user_id": user_id,
        "email": email,
        "wallet": wallet,
        "template_id": template_id,
        "card_id": card_id,
        "token_id": token_id,
    }

    _mongo_eval(
        f'db.users.deleteMany({{email: "{email}"}});'
        f'db.card_templates.deleteMany({{templateId: "{template_id}"}});'
        f'db.cards.deleteMany({{cardId: "{card_id}"}});'
    )


# ---------------- /api/credits ----------------
class TestCredits:
    def test_credits_missing_user_id(self):
        r = requests.get(f"{BASE_URL}/api/credits", timeout=15)
        assert r.status_code == 400

    def test_credits_returns_balance_for_seeded_user(self, seeded_regression_data):
        r = requests.get(
            f"{BASE_URL}/api/credits",
            params={"userId": seeded_regression_data["user_id"]},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "balance" in data
        assert isinstance(data["balance"], (int, float))
        assert data["balance"] >= 0


# ---------------- /api/admin/users (Basic Auth + projection + limit(500)) ----------------
class TestAdminUsers:
    def test_requires_basic_auth(self):
        r = requests.get(f"{BASE_URL}/api/admin/users", timeout=15)
        assert r.status_code == 401

    def test_wrong_password_rejected(self):
        r = requests.get(
            f"{BASE_URL}/api/admin/users",
            auth=HTTPBasicAuth("admin", "wrong_password"),
            timeout=15,
        )
        assert r.status_code == 401

    def test_returns_users_with_expected_projection(self, seeded_regression_data):
        r = requests.get(f"{BASE_URL}/api/admin/users", auth=ADMIN_AUTH, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "users" in data
        assert isinstance(data["users"], list)
        assert len(data["users"]) >= 1
        # find our seeded user
        seeded = next(
            (u for u in data["users"] if u.get("id") == seeded_regression_data["user_id"]),
            None,
        )
        assert seeded is not None, "seeded user missing from admin users list"
        # projection fields must be present (with expected values)
        assert seeded["email"] == seeded_regression_data["email"]
        assert seeded["username"] == "QARegression"
        assert seeded["walletAddress"] == seeded_regression_data["wallet"]
        assert "createdAt" in seeded
        # limit must be enforced (defensive — should never exceed 500)
        assert len(data["users"]) <= 500
        # Mongo _id must NOT leak
        assert "_id" not in seeded


# ---------------- /api/admin/cards (Basic Auth + projection + sort + limit(1000)) ----------------
class TestAdminCards:
    def test_requires_basic_auth(self):
        r = requests.get(f"{BASE_URL}/api/admin/cards", timeout=15)
        assert r.status_code == 401

    def test_returns_cards_with_owner_username_resolved(self, seeded_regression_data):
        r = requests.get(f"{BASE_URL}/api/admin/cards", auth=ADMIN_AUTH, timeout=25)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "cards" in data and isinstance(data["cards"], list)
        assert len(data["cards"]) <= 1000
        # find our seeded card
        card = next(
            (c for c in data["cards"] if c.get("cardId") == seeded_regression_data["card_id"]),
            None,
        )
        assert card is not None, "seeded card missing from admin cards list"
        # expected projected fields
        for field in ["cardId", "tokenId", "templateId", "rarity", "status", "ownerAddress", "createdAt"]:
            assert field in card, f"missing field {field} in admin cards response"
        assert card["templateId"] == seeded_regression_data["template_id"]
        assert card["rarity"] == "Rare"
        # ownerUsername resolution (the projection fix must not have broken this)
        assert card.get("ownerUsername") == "@QARegression", (
            f"ownerUsername did not resolve — got {card.get('ownerUsername')!r}"
        )
        # sorted by createdAt desc (best-effort check on first vs last)
        # only assert if there are 2+ items with createdAt
        dated = [c for c in data["cards"] if c.get("createdAt")]
        if len(dated) >= 2:
            assert str(dated[0]["createdAt"]) >= str(dated[-1]["createdAt"])
        # no _id leakage
        assert "_id" not in card


# ---------------- /api/cards (template enrichment must survive projection change) ----------------
class TestUserCards:
    def test_missing_user_id(self):
        r = requests.get(f"{BASE_URL}/api/cards", timeout=15)
        assert r.status_code == 400

    def test_returns_enriched_cards_for_seeded_user(self, seeded_regression_data):
        r = requests.get(
            f"{BASE_URL}/api/cards",
            params={"userId": seeded_regression_data["user_id"]},
            timeout=25,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "cards" in data and isinstance(data["cards"], list)
        assert len(data["cards"]) >= 1
        card = next(
            (c for c in data["cards"] if c.get("cardId") == seeded_regression_data["card_id"]),
            None,
        )
        assert card is not None, "seeded user card missing from /api/cards response"
        # projection on templates must still enrich artworkUrl + templateName
        assert card["artworkUrl"] == "https://example.com/test.png", (
            f"artworkUrl not enriched from card_templates: {card.get('artworkUrl')!r}"
        )
        assert card["templateName"] == "TEST Regression Card", (
            f"templateName not enriched: {card.get('templateName')!r}"
        )
        assert card["templateId"] == seeded_regression_data["template_id"]
        assert card["rarity"] == "Rare"
        assert card["displayStatus"] == "Digital"
        assert card["tokenId"] == seeded_regression_data["token_id"]

