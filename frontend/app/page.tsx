"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PackCard from "@/components/PackCard";

const RARITY_COLORS = ["border-gray-300", "border-blue-400", "border-purple-400", "border-yellow-400"];
const RARITY_BG = ["bg-gray-50", "bg-blue-50", "bg-purple-50", "bg-yellow-50"];
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
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Selamat Datang di Gachard</h1>
      <p className="text-gray-600 mb-8">Platform kartu TCG digital-native dengan mekanisme lock-vault-redeem.</p>

      {user && balance !== null && (
        <div className="bg-indigo-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-indigo-700">Saldo: <span className="font-bold">{balance} Credit</span></p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PackCard price={500} onBuy={handleBuyPack} loading={loading} />
      </div>

      {/* Reveal — grid 8 kartu */}
      {reveal && !reveal.error && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4 text-center">Pack Dibuka!</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {reveal.cards?.map((card: any, i: number) => (
              <div
                key={i}
                className={`rounded-xl overflow-hidden shadow-md border-2 ${RARITY_COLORS[card.rarity]} ${RARITY_BG[card.rarity]}`}
              >
                {card.template?.artworkUrl ? (
                  <img src={card.template.artworkUrl} alt={card.template.name} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gray-200 flex items-center justify-center">
                    <span className="text-4xl">🎴</span>
                  </div>
                )}
                <div className="p-2 text-center">
                  <p className="text-xs font-medium">{card.template?.name}</p>
                  <p className={`text-xs font-bold ${card.rarity >= 2 ? "text-purple-600" : "text-gray-600"}`}>
                    {RARITY_LABELS[card.rarity]}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-gray-500 text-center">
            <a href="/koleksi" className="text-indigo-600 underline">Lihat di Koleksi →</a>
          </p>
        </div>
      )}

      {reveal?.error && (
        <div className="mt-8 bg-red-50 text-red-700 p-4 rounded-lg text-center">
          {reveal.error}
        </div>
      )}
    </div>
  );
}
