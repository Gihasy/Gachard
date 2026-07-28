"use client";

interface PackCardProps {
  type: "standard" | "booster";
  price: number;
  cardCount: number;
  guaranteedRare: number;
  onBuy: () => Promise<void>;
  loading?: boolean;
}

const PACK_STYLES = {
  standard: {
    gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    accent: "var(--electric-blue)",
    icon: "🎴",
  },
  booster: {
    gradient: "linear-gradient(135deg, #2d1b69 0%, #11001c 50%, #4a0e4e 100%)",
    accent: "var(--aurora-gold)",
    icon: "🚀",
  },
} as const;

export default function PackCard({
  type,
  price,
  cardCount,
  guaranteedRare,
  onBuy,
  loading = false,
}: PackCardProps) {
  const style = PACK_STYLES[type];

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-8 text-center transition-all hover:scale-[1.02] hover:shadow-2xl"
      style={{
        background: style.gradient,
        border: `1px solid ${style.accent}33`,
        boxShadow: `0 8px 32px ${style.accent}22`,
      }}
    >
      {/* Decorative glow */}
      <div
        className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-20"
        style={{ background: style.accent }}
      />

      <div className="relative z-10">
        <div className="text-6xl mb-4">{style.icon}</div>
        <h3
          className="font-display text-2xl font-bold mb-2 uppercase"
          style={{ color: style.accent }}
        >
          {type === "standard" ? "Standard Pack" : "Booster Pack"}
        </h3>
        <p className="text-sm text-white/60 mb-1">
          {cardCount} random cards
        </p>
        <p className="text-xs text-white/40 mb-6">
          Guaranteed {guaranteedRare} Rare+
        </p>
        <p
          className="text-4xl font-bold mb-6"
          style={{ color: "var(--aurora-gold)" }}
        >
          {price} Credit
        </p>
        <button
          onClick={onBuy}
          disabled={loading}
          className="w-full py-3 px-6 rounded-2xl text-sm font-medium transition-all disabled:opacity-50"
          style={{
            background: `linear-gradient(135deg, ${style.accent}, ${style.accent}88)`,
            color: "#fff",
          }}
        >
          {loading ? "Opening..." : "Buy & Open"}
        </button>
      </div>
    </div>
  );
}
