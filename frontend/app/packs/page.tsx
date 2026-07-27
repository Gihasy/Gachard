"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PackCard from "@/components/PackCard";
import PackReveal, { type RevealResult } from "@/components/home/PackReveal";

interface SessionUser {
  user_id: string;
  username: string;
}

export default function PacksPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [reveal, setReveal] = useState<RevealResult | null>(null);
  const [loadingType, setLoadingType] = useState<"standard" | "booster" | null>(null);

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
    fetch(`/api/credits?userId=${user.user_id}`)
      .then((r) => r.json())
      .then((d) => setBalance(d.balance ?? 0))
      .catch(() => setBalance(0));
  }, [ready, user]);

  const handleBuy = useCallback(
    async (packType: "standard" | "booster") => {
      if (!user) {
        router.push("/login");
        return;
      }
      setLoadingType(packType);
      setReveal(null);
      try {
        const res = await fetch("/api/mint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.user_id, packType }),
        });
        const data = await res.json();
        if (res.ok) {
          setReveal(data as RevealResult);
          // Refresh balance
          fetch(`/api/credits?userId=${user.user_id}`)
            .then((r) => r.json())
            .then((d) => setBalance(d.balance ?? 0))
            .catch(() => {});
        } else {
          setReveal({ error: data.error || "Failed to open pack" });
        }
      } catch {
        setReveal({ error: "Network error. Please try again." });
      } finally {
        setLoadingType(null);
      }
    },
    [user, router]
  );

  if (!ready || !user) return null;

  return (
    <PageShell
      testId="packs-page"
      eyebrow="Packs"
      title={
        <>
          <span className="text-gradient-aurora">Choose Your Pack</span>
        </>
      }
      description="Open packs to discover new cards and build your collection."
    >
      {/* Balance */}
      {balance !== null && (
        <div className="flex items-center justify-center gap-4 mb-8">
          <span className="text-sm text-white/60">Your Balance: </span>
          <span className="text-lg font-display" style={{ color: "var(--aurora-gold)" }}>
            {balance.toLocaleString()} Credit
          </span>
          <Link
            href="/topup"
            className="btn-gold !py-1.5 !px-3 !text-xs"
            data-testid="packs-topup-btn"
          >
            Top Up
          </Link>
        </div>
      )}

      {/* Pack Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        <PackCard
          type="standard"
          price={500}
          cardCount={5}
          guaranteedRare={1}
          onBuy={() => handleBuy("standard")}
          loading={loadingType === "standard"}
        />
        <PackCard
          type="booster"
          price={800}
          cardCount={10}
          guaranteedRare={2}
          onBuy={() => handleBuy("booster")}
          loading={loadingType === "booster"}
        />
      </div>

      {/* Reveal */}
      {reveal && <PackReveal result={reveal} />}
    </PageShell>
  );
}
