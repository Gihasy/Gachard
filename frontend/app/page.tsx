"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PackCard from "@/components/PackCard";

const RARITY_GLOW = ["", "glow-rare", "glow-epic", "glow-legendary"];
const RARITY_COLORS = ["var(--rarity-common)", "var(--rarity-rare)", "var(--rarity-epic)", "var(--rarity-legendary)"];
const RARITY_LABELS = ["Common", "Rare", "Epic", "Legendary"];

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [reveal, setReveal] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      fetch(`/api/credits?userId=${u.user_id}`)
        .then((r) => r.json())
        .then((d) => setBalance(d.balance));
    }
  }, []);

  const handleBuyPack = async () => {
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
        setBalance(data.newBalance);
        setReveal(data);
      } else {
        setReveal({ error: data.error || "Gagal beli pack" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <div className="text-center py-12">
        <h1
          className="text-5xl md:text-6xl font-bold mb-4 uppercase tracking-tight"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.05em" }}
        >
          Collect. Play. Trade.
        </h1>
        <p className="text-lg mb-2" style={{ color: "var(--aurora-gold)" }}>
          One bond. Infinite legends.
        </p>
        <p className="text-sm mb-8" style={{ color: "var(--silver-mist)" }}>
          Enter the world of Gachard and build your legacy with powerful cards and trusted connections.
        </p>

        {user && balance !== null && (
          <div className="inline-block rounded-full px-6 py-2 mb-6" style={{ background: "rgba(184,172,255,0.1)", border: "1px solid rgba(184,172,255,0.2)" }}>
            <span className="text-sm" style={{ color: "var(--silver-mist)" }}>Saldo: </span>
            <span className="font-bold text-lg" style={{ color: "var(--aurora-gold)" }}>{balance} Credit</span>
          </div>
        )}

        <div className="flex justify-center gap-4 mb-8">
          <PackCard price={500} onBuy={handleBuyPack} loading={loading} />
        </div>
      </div>

      {/* Reveal Section */}
      {reveal && !reveal.error && (
        <div className="mt-4">
          <h2 className="text-2xl font-bold mb-6 text-center uppercase" style={{ color: "var(--text-primary)" }}>
            Pack Dibuka!
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {reveal.cards?.map((card: any, i: number) => (
              <div
                key={i}
                className={`card-surface overflow-hidden ${RARITY_GLOW[card.rarity]}`}
                style={{ borderColor: RARITY_COLORS[card.rarity] }}
              >
                {card.template?.artworkUrl ? (
                  <img src={card.template.artworkUrl} alt={card.template.name} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <span className="text-4xl">🎴</span>
                  </div>
                )}
                <div className="p-3 text-center">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{card.template?.name}</p>
                  <span
                    className={`tag tag-${RARITY_LABELS[card.rarity].toLowerCase()}`}
                  >
                    {RARITY_LABELS[card.rarity]}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-center">
            <a href="/koleksi" style={{ color: "var(--cosmic-violet)" }}>Lihat di Koleksi →</a>
          </p>
        </div>
      )}

      {reveal?.error && (
        <div className="mt-8 p-4 rounded-lg text-center" style={{ background: "rgba(255,107,186,0.1)", color: "var(--aurora-pink)" }}>
          {reveal.error}
        </div>
      )}
    </div>
  );
}
