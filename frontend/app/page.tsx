"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import HomeHero from "@/components/home/HomeHero";
import HomeFeaturedCards from "@/components/home/HomeFeaturedCards";
import HomeWhyGachard from "@/components/home/HomeWhyGachard";
import HomeHowItWorks from "@/components/home/HomeHowItWorks";
import HomeCtaBand from "@/components/home/HomeCtaBand";

interface SessionUser {
  user_id: string;
  username: string;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

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

  const handleExplore = () => {
    if (user) {
      router.push("/packs");
    } else {
      router.push("/login");
    }
  };

  return (
    <div data-testid="home-page">
      <HomeHero
        onExplore={handleExplore}
        exploreLoading={false}
        isAuthenticated={!!user}
      />
      <HomeFeaturedCards />
      <HomeWhyGachard />
      <HomeHowItWorks />
      <HomeCtaBand onOpenPack={handleExplore} loading={false} />
    </div>
  );
}
