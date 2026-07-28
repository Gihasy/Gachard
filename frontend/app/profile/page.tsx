"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import PageShell from "@/components/PageShell";

type SessionUser = { user_id: string; username: string; email?: string };
type Card = {
  tokenId: number | null;
  templateId: string;
  rarity: number;
  status: string;
  fulfillmentStatus?: string;
  artworkUrl?: string;
  templateName?: string;
};

const RARITY_COLORS = [
  "var(--rarity-common)",
  "var(--rarity-rare)",
  "var(--rarity-epic)",
  "var(--rarity-legendary)",
];
const RARITY_GLOW = ["", "glow-rare", "glow-epic", "glow-legendary"];
const RARITY_LABELS = ["Common", "Rare", "Epic", "Legendary"];

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
      .catch(() => {});

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
    digital: cards.filter((c) => !c.fulfillmentStatus).length,
    inProgress: cards.filter((c) => c.fulfillmentStatus && ["Locked", "Processing", "Printed", "Shipping"].includes(c.fulfillmentStatus)).length,
    real: cards.filter((c) => c.fulfillmentStatus === "Real").length,
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
      testId="profile-page"
      eyebrow="Your Account"
      title={
        <>
          <span className="text-gradient-aurora">Profile</span>
        </>
      }
      description="Your Gachard identity, credit balance, and collection at a glance."
      actions={
        <>
          <Link href="/topup" className="btn-primary" data-testid="profile-topup-btn">
            Top Up
          </Link>
          <button
            onClick={handleLogout}
            className="btn-ghost"
            data-testid="profile-logout-btn"
          >
            Log out
          </button>
        </>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_1.6fr]">
        {/* Left column: Profile + Stats + Redeem */}
        <div className="space-y-6">
          {/* Identity + Balance */}
          <div className="glass p-8" data-testid="profile-identity">
            <div className="flex items-center gap-5 mb-6">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center shrink-0 font-display text-3xl text-white"
                style={{
                  background:
                    "linear-gradient(135deg, var(--cosmic-violet-deep), var(--aurora-pink) 60%, var(--electric-blue))",
                  boxShadow: "0 12px 40px -8px rgba(138,92,255,0.5)",
                }}
                data-testid="profile-avatar"
              >
                {user?.username?.charAt(0).toUpperCase() ?? "G"}
              </div>
              <div className="min-w-0">
                <p
                  className="font-display text-2xl text-white truncate"
                  data-testid="profile-username"
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

            <div
              className="p-5 rounded-2xl flex items-center justify-between"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,196,102,0.12), rgba(255,107,186,0.06))",
                border: "1px solid rgba(255,196,102,0.3)",
              }}
              data-testid="profile-balance"
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
                data-testid="profile-balance-topup"
              >
                Top Up
              </Link>
            </div>
          </div>

          {/* Collection Stats */}
          <div className="glass p-6" data-testid="profile-stats">
            <p
              className="text-[0.72rem] uppercase tracking-[0.22em] mb-4"
              style={{ color: "var(--cosmic-violet)" }}
            >
              Collection Stats
            </p>
            <div className="grid grid-cols-3 gap-3">
              <StatBlock label="Total" value={stats.total} color="#FFFFFF" />
              <StatBlock label="Digital" value={stats.digital} color="var(--electric-blue)" />
              <StatBlock label="In Progress" value={stats.inProgress} color="var(--aurora-gold)" />
              <StatBlock label="Real" value={stats.real} color="#00ff88" />
              <StatBlock label="Legendary" value={stats.legendary} color="var(--aurora-gold)" />
              <StatBlock label="Epic" value={stats.epic} color="var(--cosmic-violet)" />
            </div>
          </div>

          {/* Redeem Card */}
          <div
            className="glass p-6"
            data-testid="profile-redeem"
            style={{ borderColor: "rgba(0,255,136,0.2)" }}
          >
            <p
              className="text-[0.72rem] uppercase tracking-[0.22em] mb-3"
              style={{ color: "#00ff88" }}
            >
              Redeem a Physical Card
            </p>
            <p className="text-xs text-white/50 mb-4">
              Got a physical Gachard card? Enter the Card ID and redeem code to claim it.
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

        {/* Right column: Card Collection */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p
              className="text-[0.72rem] uppercase tracking-[0.22em]"
              style={{ color: "var(--cosmic-violet)" }}
            >
              Your Collection
            </p>
            <Link
              href="/collection"
              className="text-xs text-white/50 hover:text-white transition-colors"
            >
              View All →
            </Link>
          </div>

          {cards.length === 0 ? (
            <div
              className="glass p-10 text-center"
              data-testid="profile-empty"
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
              <Link href="/packs" className="btn-primary" data-testid="profile-first-pack">
                Open First Pack
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {cards.map((card, i) => {
                const rarity = Math.max(0, Math.min(3, card.rarity)) as 0 | 1 | 2 | 3;
                return (
                  <div
                    key={card.tokenId ?? `card-${i}`}
                    className={`glass glass-hover overflow-hidden p-2.5 ${RARITY_GLOW[rarity]}`}
                    style={{ borderColor: RARITY_COLORS[rarity] }}
                    data-testid={`profilee-card-${card.tokenId}`}
                  >
                    <div
                      className="relative w-full rounded-xl overflow-hidden mb-2 bg-white/5"
                      style={{ aspectRatio: "5/7" }}
                    >
                      {card.artworkUrl ? (
                        <Image
                          src={card.artworkUrl}
                          alt={card.templateName || card.templateId}
                          fill
                          sizes="(max-width:768px) 40vw, 20vw"
                          className="object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-3xl text-white/30">◆</span>
                        </div>
                      )}
                    </div>
                    <div className="px-1 pb-1">
                      <p className="text-xs font-medium text-white truncate">
                        {card.tokenId !== null ? `Card #${card.tokenId}` : card.templateId}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span
                          className={`tag tag-${RARITY_LABELS[rarity].toLowerCase()} text-[0.55rem]`}
                        >
                          {RARITY_LABELS[rarity]}
                        </span>
                        <span
                          className="text-[0.55rem] uppercase tracking-widest px-1.5 py-0.5 rounded"
                          style={{
                            background:
                              card.status === "Real"
                                ? "rgba(0,255,136,0.15)"
                                : card.status === "Vaulted"
                                ? "rgba(255,107,186,0.15)"
                                : "rgba(0,204,255,0.15)",
                            color:
                              card.status === "Real"
                                ? "#00ff88"
                                : card.status === "Vaulted"
                                ? "#ff6bba"
                                : "#00ccff",
                          }}
                        >
                          {card.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageShell>
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
      className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center"
      data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <p className="font-display text-xl" style={{ color }}>
        {value}
      </p>
      <p className="text-[0.6rem] uppercase tracking-widest text-white/50 mt-0.5">
        {label}
      </p>
    </div>
  );
}
