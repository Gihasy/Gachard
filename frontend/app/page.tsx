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
  const [reveal, setReveal] = useState<RevealResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Mount-only: hydrate the user from local session.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("user");
    if (!stored) return;
    try {
      setUser(JSON.parse(stored) as SessionUser);
    } catch {
      /* corrupt session — ignore */
    }
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
        setReveal(data as RevealResult);
      } else {
        setReveal({ error: data.error || "Failed to open pack" });
      }
    } catch {
      setReveal({ error: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  return (
    <div data-testid="home-page">
      <HomeHero
        onExplore={handleBuyPack}
        exploreLoading={loading}
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
