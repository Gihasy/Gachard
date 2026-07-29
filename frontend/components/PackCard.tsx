"use client";

import Image from "next/image";

interface PackCardProps {
  type: "standard" | "booster";
  price: number;
  cardCount: number;
  guaranteedRare: number;
  onBuy: () => Promise<void> | void;
  loading?: boolean;
}

const PACK_STYLES = {
  standard: {
    label: "Standard Pack",
    accent: "var(--electric-blue)",
    accentRgb: "0,204,255",
    surface: "linear-gradient(160deg, #101a33 0%, #0f2447 55%, #0b1730 100%)",
  },
  booster: {
    label: "Booster Pack",
    accent: "var(--aurora-gold)",
    accentRgb: "255,196,102",
    surface: "linear-gradient(160deg, #221345 0%, #2d1b69 50%, #1a0b33 100%)",
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
  const s = PACK_STYLES[type];

  return (
    <div
      className="glass glass-hover relative overflow-hidden flex flex-col"
      style={{
        background: s.surface,
        borderColor: `rgba(${s.accentRgb},0.28)`,
        boxShadow: `0 20px 60px -24px rgba(${s.accentRgb},0.4)`,
      }}
      data-testid={`pack-card-${type}`}
    >
      {/* corner glow */}
      <div
        className="absolute -top-24 -right-24 w-56 h-56 rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{ background: s.accent }}
      />
      <span className="grid-lines opacity-30" />

      {/* Full pack image */}
      <div className="relative w-full aspect-[3/4]" data-testid={`pack-image-${type}`}>
        <Image
          src={`/packs/${type}.png`}
          alt={s.label}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 384px"
        />
      </div>

      {/* Info section */}
      <div className="relative z-10 p-6 pt-5 text-center">
        <h3 className="font-display text-xl uppercase mb-3" style={{ color: s.accent }}>
          {s.label}
        </h3>

        {/* stat row */}
        <div className="flex items-stretch justify-center gap-3 mb-4">
          <div className="flex-1 rounded-xl py-2.5 bg-white/[0.04] border border-white/[0.07]">
            <p className="font-display text-lg text-white">{cardCount}</p>
            <p className="text-[0.6rem] uppercase tracking-widest text-white/45">Cards</p>
          </div>
          <div className="flex-1 rounded-xl py-2.5 bg-white/[0.04] border border-white/[0.07]">
            <p className="font-display text-lg" style={{ color: s.accent }}>{guaranteedRare}</p>
            <p className="text-[0.6rem] uppercase tracking-widest text-white/45">Rare+</p>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-baseline justify-center gap-1.5 mb-4">
          <span className="font-display text-3xl" style={{ color: "var(--aurora-gold)" }}>
            {price.toLocaleString()}
          </span>
          <span className="text-xs text-white/50 uppercase tracking-widest">Credit</span>
        </div>

        {/* Buy button */}
        <button
          onClick={onBuy}
          disabled={loading}
          className={`w-full ${type === "booster" ? "btn-gold" : "btn-primary"} disabled:opacity-50`}
          data-testid={`pack-buy-${type}`}
        >
          {loading ? "Opening…" : "Buy & Open"}
        </button>
      </div>
    </div>
  );
}
