"""Backend API tests for Emergent-managed Google Auth integration on Gachard."""
import os
import subprocess
import json
import time
import pytest
import requests
from dotenv import dotenv_values

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
            set_cookie = r.headers.get("set-cookie", "")
            assert "session_token=" in set_cookie
            assert "gachard_uid=" in set_cookie

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
