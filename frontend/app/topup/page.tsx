"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const PRESETS = [500, 1000, 2000, 5000]; // $5, $10, $20, $50

export default function TopUp() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [amount, setAmount] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/login");
      return;
    }
    const u = JSON.parse(stored);
    setUser(u);
    fetch(`/api/credits?userId=${u.user_id}`)
      .then((r) => r.json())
      .then((d) => setBalance(d.balance));
  }, [router]);

  const handleTopUp = async () => {
    if (!user) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/credits/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.user_id, amountCents: amount }),
      });

      const data = await res.json();
      if (res.ok) {
        setBalance(data.newBalance);
        setMessage(`Top-up berhasil! Saldo: $${(data.newBalance / 100).toFixed(2)}`);
      } else {
        setMessage(data.error || "Top-up gagal");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-8">Top Up Credit</h1>

      {balance !== null && (
        <div className="bg-indigo-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-indigo-700">Saldo saat ini: <span className="font-bold">${(balance / 100).toFixed(2)}</span></p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setAmount(p)}
            className={`py-3 rounded-lg font-medium ${amount === p ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            ${(p / 100).toFixed(2)}
          </button>
        ))}
      </div>

      <button
        onClick={handleTopUp}
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "Processing..." : `Top Up $${(amount / 100).toFixed(2)}`}
      </button>

      {message && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${message.includes("berhasil") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message}
        </div>
      )}
    </div>
  );
}
