"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageShell from "@/components/PageShell";

type SessionUser = { user_id: string; username: string; email?: string };
type Card = { rarity: number; status?: string };

export default function Profil() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [redeemTokenId, setRedeemTokenId] = useState("");
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Mount-only: hydrate session. Setters from useState are stable.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("user");
    if (!stored) {
      window.location.replace("/login");
      return;
    }
    try {
      setUser(JSON.parse(stored));
      setReady(true);
    } catch {
      window.location.replace("/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;
    fetch(`/api/credits?userId=${user.user_id}`)
      .then((r) => r.json())
      .then((d: { balance?: number }) => {
        if (!cancelled) setBalance(d.balance ?? 0);
      })
      .catch(() => {
        if (!cancelled) setBalance(0);
      });

    fetch(`/api/cards?userId=${user.user_id}`)
      .then((r) => r.json())
      .then((d: { cards?: Card[] }) => {
        if (!cancelled) setCards(d.cards ?? []);
      })
      .catch(() => {
        /* stats will show zero — silently ignore */
      });

    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  const stats = {
    total: cards.length,
    legendary: cards.filter((c) => c.rarity === 3).length,
    epic: cards.filter((c) => c.rarity === 2).length,
    rare: cards.filter((c) => c.rarity === 1).length,
    common: cards.filter((c) => c.rarity === 0).length,
    vaulted: cards.filter((c) => c.status === "Print Requested" || c.status === "Real").length,
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    document.cookie = "gachard_uid=; path=/; max-age=0; SameSite=Lax";
    router.push("/");
  };

  const handleRedeem = async () => {
    if (!user || !redeemTokenId.trim() || !redeemCode.trim()) return;
    setRedeemLoading(true);
    setRedeemMessage(null);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.user_id,
          tokenId: parseInt(redeemTokenId.trim()),
          code: redeemCode.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRedeemMessage({
          text: `Card #${redeemTokenId} redeemed successfully! It's now in your collection.`,
          ok: true,
        });
        setRedeemTokenId("");
        setRedeemCode("");
        // Refresh cards
        fetch(`/api/cards?userId=${user.user_id}`)
          .then((r) => r.json())
          .then((d: { cards?: Card[] }) => setCards(d.cards ?? []))
          .catch(() => {});
      } else {
        setRedeemMessage({ text: data.error || "Redeem failed", ok: false });
      }
    } catch {
      setRedeemMessage({ text: "Network error", ok: false });
    } finally {
      setRedeemLoading(false);
    }
  };

  if (!ready || !user) return null;

  return (
    <PageShell
      testId="profil-page"
      eyebrow="Your Account"
      title={
        <>
          <span className="text-gradient-aurora">Profile</span>
        </>
      }
      description="Your Gachard identity, credit balance, and collection at a glance."
      actions={
        <>
          <Link href="/topup" className="btn-primary" data-testid="profil-topup-btn">
            Top Up
          </Link>
          <button
            onClick={handleLogout}
            className="btn-ghost"
            data-testid="profil-logout-btn"
          >
            Log out
          </button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
          {/* Identity card */}
          <div className="space-y-6">
            <div className="glass p-8" data-testid="profil-identity">
              <div className="flex items-center gap-5 mb-6">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center shrink-0 font-display text-3xl text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--cosmic-violet-deep), var(--aurora-pink) 60%, var(--electric-blue))",
                    boxShadow: "0 12px 40px -8px rgba(138,92,255,0.5)",
                  }}
                  data-testid="profil-avatar"
                >
                  {user?.username?.charAt(0).toUpperCase() ?? "G"}
                </div>
                <div className="min-w-0">
                  <p
                    className="font-display text-2xl text-white truncate"
                    data-testid="profil-username"
                  >
                    @{user?.username ?? "player"}
                  </p>
                  {user?.email && (
                    <p className="text-sm text-white/60 truncate">
                      {user.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Balance */}
              <div
                className="p-5 rounded-2xl flex items-center justify-between"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,196,102,0.12), rgba(255,107,186,0.06))",
                  border: "1px solid rgba(255,196,102,0.3)",
                }}
                data-testid="profil-balance"
              >
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.22em] text-white/60 mb-1">
                    Credit Balance
                  </p>
                  <p
                    className="font-display text-2xl"
                    style={{ color: "var(--aurora-gold)" }}
                  >
                    {(balance ?? 0).toLocaleString()}
                  </p>
                </div>
                <Link
                  href="/topup"
                  className="btn-gold !py-2.5 !px-4 !text-[0.7rem]"
                  data-testid="profil-balance-topup"
                >
                  Top Up
                </Link>
              </div>
            </div>

            {/* Quick actions */}
            <div className="glass p-6" data-testid="profil-quick-actions">
              <p
                className="text-[0.72rem] uppercase tracking-[0.22em] mb-4"
                style={{ color: "var(--cosmic-violet)" }}
              >
                Quick actions
              </p>
              <div className="grid grid-cols-2 gap-3">
                <QuickAction href="/collection" label="Collection" />
                <QuickAction href="/topup" label="Top Up" />
                <QuickAction href="/scan" label="Scan Card" />
                <QuickAction href="/marketplace" label="Marketplace" />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-6">
            <div className="glass p-8" data-testid="profil-stats">
              <p
                className="text-[0.72rem] uppercase tracking-[0.22em] mb-5"
                style={{ color: "var(--cosmic-violet)" }}
              >
                Collection stats
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <StatBlock label="Total Cards" value={stats.total} color="#FFFFFF" />
                <StatBlock label="Legendary" value={stats.legendary} color="var(--aurora-gold)" />
                <StatBlock label="Epic" value={stats.epic} color="var(--cosmic-violet)" />
                <StatBlock label="Rare" value={stats.rare} color="var(--electric-blue)" />
                <StatBlock label="Common" value={stats.common} color="#9CA3AF" />
                <StatBlock label="Vaulted" value={stats.vaulted} color="var(--aurora-pink)" />
              </div>
            </div>

            {stats.total === 0 && (
              <div
                className="glass p-8 text-center"
                data-testid="profil-empty"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(184,172,255,0.10), rgba(255,107,186,0.05))",
                  borderColor: "rgba(184,172,255,0.25)",
                }}
              >
                <p className="text-white/70 mb-4">
                  You haven't opened any packs yet. Your journey starts with your
                  first card.
                </p>
                <Link href="/" className="btn-primary" data-testid="profil-first-pack">
                  Open First Pack
                </Link>
              </div>
            )}

            {/* Redeem Card */}
            <div
              className="glass p-6"
              data-testid="profil-redeem"
              style={{ borderColor: "rgba(0,255,136,0.2)" }}
            >
              <p
                className="text-[0.72rem] uppercase tracking-[0.22em] mb-4"
                style={{ color: "#00ff88" }}
              >
                Redeem a Physical Card
              </p>
              <p className="text-xs text-white/50 mb-4">
                Got a physical Gachard card? Enter the Card ID (from QR code) and
                the redeem code printed on the card to claim it.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-[0.65rem] uppercase tracking-widest text-white/40 mb-1.5">
                    Card ID
                  </label>
                  <input
                    type="number"
                    value={redeemTokenId}
                    onChange={(e) => setRedeemTokenId(e.target.value)}
                    placeholder="e.g. 14"
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
                    data-testid="redeem-token-input"
                  />
                </div>
                <div>
                  <label className="block text-[0.65rem] uppercase tracking-widest text-white/40 mb-1.5">
                    Redeem Code
                  </label>
                  <input
                    type="text"
                    value={redeemCode}
                    onChange={(e) => setRedeemCode(e.target.value)}
                    placeholder="e.g. xIdVoe2A0TWZvNOR"
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30 font-mono"
                    data-testid="redeem-code-input"
                  />
                </div>
                <button
                  onClick={handleRedeem}
                  disabled={redeemLoading || !redeemTokenId.trim() || !redeemCode.trim()}
                  className="w-full py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,204,255,0.15))",
                    border: "1px solid rgba(0,255,136,0.4)",
                    color: "#00ff88",
                  }}
                  data-testid="redeem-submit-btn"
                >
                  {redeemLoading ? "Redeeming..." : "Redeem Card"}
                </button>
              </div>
              {redeemMessage && (
                <div
                  className="mt-3 p-3 rounded-xl text-sm"
                  style={{
                    background: redeemMessage.ok ? "rgba(0,255,136,0.08)" : "rgba(255,107,186,0.08)",
                    border: redeemMessage.ok
                      ? "1px solid rgba(0,255,136,0.3)"
                      : "1px solid rgba(255,107,186,0.3)",
                    color: redeemMessage.ok ? "#00ff88" : "#ff6bba",
                  }}
                  data-testid="redeem-message"
                >
                  {redeemMessage.text}
                </div>
              )}
            </div>
          </div>
        </div>
    </PageShell>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.2] transition-all group"
      data-testid={`quick-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <span className="text-sm font-medium text-white">{label}</span>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        className="transition-transform group-hover:translate-x-0.5"
        style={{ color: "var(--cosmic-violet)" }}
      >
        <path
          d="M5 12h14M13 5l7 7-7 7"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}

function StatBlock({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
      data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <p className="font-display text-2xl" style={{ color }}>
        {value}
      </p>
      <p className="text-[0.65rem] uppercase tracking-widest text-white/50 mt-1">
        {label}
      </p>
    </div>
  );
}
