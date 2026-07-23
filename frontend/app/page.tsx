"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import HomeHero from "@/components/home/HomeHero";
import HomeFeaturedCards from "@/components/home/HomeFeaturedCards";
import HomeWhyGachard from "@/components/home/HomeWhyGachard";
import HomeHowItWorks from "@/components/home/HomeHowItWorks";
import HomeCtaBand from "@/components/home/HomeCtaBand";
import PackReveal, { type RevealResult } from "@/components/home/PackReveal";

interface SessionUser {
  user_id: string;
  username: string;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [reveal, setReveal] = useState<RevealResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Mount-only: hydrate the user + credit balance from local session.
  // State setters are stable (React guarantee) so they don't need to be
  // in the deps array.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("user");
    if (!stored) return;
    let cancelled = false;
    try {
      const u = JSON.parse(stored) as SessionUser;
      setUser(u);
      fetch(`/api/credits?userId=${u.user_id}`)
        .then((r) => r.json())
        .then((d: { balance?: number }) => {
          if (!cancelled) setBalance(d.balance ?? 0);
        })
        .catch(() => {
          /* balance is optional — silently ignore failures */
        });
    } catch {
      /* corrupt session — ignore */
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBuyPack = useCallback(async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setLoading(true);
    setReveal(null);
    try {
      const res = await fetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.user_id }),
      });
      const data = await res.json();
      if (res.ok) {
        setBalance(data.newBalance ?? balance);
        setReveal(data as RevealResult);
      } else {
        setReveal({ error: data.error || "Failed to open pack" });
      }
    } catch {
      setReveal({ error: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }, [user, router, balance]);

  return (
    <div data-testid="home-page">
      <HomeHero
        onExplore={handleBuyPack}
        exploreLoading={loading}
        balance={balance}
        isAuthenticated={!!user}
      />

      {reveal && <PackReveal result={reveal} />}

      <HomeFeaturedCards />
      <HomeWhyGachard />
      <HomeHowItWorks />
      <HomeCtaBand onOpenPack={handleBuyPack} loading={loading} />
    </div>
  );
}
