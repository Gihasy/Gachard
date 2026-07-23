"use client";

interface PackCardProps {
  price: number;
  onBuy: () => Promise<void>;
  loading?: boolean;
}

export default function PackCard({ price, onBuy, loading = false }: PackCardProps) {
  return (
    <div className="card-surface p-8 text-center" style={{ maxWidth: "320px" }}>
      <div className="text-5xl mb-4">🎴</div>
      <h3 className="text-xl font-bold mb-2 uppercase" style={{ color: "var(--text-primary)" }}>
        Card Pack
      </h3>
      <p className="text-sm mb-4" style={{ color: "var(--silver-mist)" }}>
        8 kartu random, minimal 1 dijamin Rare+
      </p>
      <p className="text-3xl font-bold mb-6" style={{ color: "var(--aurora-gold)" }}>
        {price} Credit
      </p>
      <button
        onClick={onBuy}
        disabled={loading}
        className="btn-cta w-full py-3 px-6 text-sm disabled:opacity-50"
      >
        {loading ? "Opening..." : "Buy Pack"}
      </button>
    </div>
  );
}
