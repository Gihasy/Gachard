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
          <p className="text-sm text-indigo-700">Saldo Credit: <span className="font-bold">${(balance / 100).toFixed(2)}</span></p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PackCard price={299} onBuy={handleBuyPack} loading={loading} />
      </div>

      {reveal && !reveal.error && (
        <div className="mt-8 text-center">
          <h2 className="text-xl font-bold mb-4">Pack Dibuka!</h2>
          <div className={`inline-block rounded-xl overflow-hidden shadow-lg border-2 ${RARITY_COLORS[reveal.rarity]} ${RARITY_BG[reveal.rarity]}`}>
            {reveal.template?.artworkUrl ? (
              <img src={reveal.template.artworkUrl} alt={reveal.template.name} className="w-48 h-64 object-cover" />
            ) : (
              <div className="w-48 h-64 bg-gray-200 flex items-center justify-center">
                <span className="text-6xl">🎴</span>
              </div>
            )}
            <div className="p-4">
              <p className="font-semibold">{reveal.template?.name}</p>
              <p className={`text-sm font-bold ${reveal.rarity >= 2 ? "text-purple-600" : "text-gray-600"}`}>
                {RARITY_LABELS[reveal.rarity]}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
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
