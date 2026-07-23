"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const PRESETS = [500, 1000, 2000, 5000];

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
        setMessage(`Top-up berhasil! Saldo: ${data.newBalance} Credit`);
      } else {
        setMessage(data.error || "Top-up gagal");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-8 uppercase" style={{ color: "var(--text-primary)" }}>
        Top Up Credit
      </h1>

      {balance !== null && (
        <div className="rounded-lg p-4 mb-6" style={{ background: "rgba(184,172,255,0.1)", border: "1px solid rgba(184,172,255,0.2)" }}>
          <p className="text-sm" style={{ color: "var(--silver-mist)" }}>
            Saldo saat ini: <span className="font-bold text-lg" style={{ color: "var(--aurora-gold)" }}>{balance} Credit</span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setAmount(p)}
            className="py-3 rounded-lg font-medium transition-all"
            style={{
              background: amount === p ? "rgba(184,172,255,0.2)" : "rgba(255,255,255,0.05)",
              color: amount === p ? "var(--cosmic-violet)" : "var(--silver-mist)",
              border: `1px solid ${amount === p ? "var(--cosmic-violet)" : "rgba(255,255,255,0.08)"}`,
            }}
          >
            {p} Credit
          </button>
        ))}
      </div>

      <button
        onClick={handleTopUp}
        disabled={loading}
        className="btn-cta w-full py-3 text-sm disabled:opacity-50"
      >
        {loading ? "Processing..." : `Top Up ${amount} Credit`}
      </button>

      {message && (
        <div
          className="mt-4 p-3 rounded-lg text-sm"
          style={{
            background: message.includes("berhasil") ? "rgba(0,204,255,0.1)" : "rgba(255,107,186,0.1)",
            color: message.includes("berhasil") ? "var(--electric-blue)" : "var(--aurora-pink)",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
