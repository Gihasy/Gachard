"use client";

import PageShell from "@/components/PageShell";

const PREVIEW_CARDS = [
  { name: "Lumora", price: "1,200", img: "/cards/legendary-1.webp", tier: "MYTHIC", color: "var(--aurora-gold)" },
  { name: "Pyrax", price: "620", img: "/cards/epic-1.webp", tier: "EPIC", color: "var(--cosmic-violet)" },
  { name: "Noxel", price: "340", img: "/cards/rare-1.webp", tier: "RARE", color: "var(--electric-blue)" },
  { name: "Auren", price: "1,050", img: "/cards/legendary-2.webp", tier: "LEGENDARY", color: "var(--aurora-gold)" },
  { name: "Nyxthalon", price: "580", img: "/cards/epic-2.webp", tier: "EPIC", color: "var(--cosmic-violet)" },
  { name: "Aquoris", price: "300", img: "/cards/rare-2.webp", tier: "RARE", color: "var(--electric-blue)" },
];

export default function Marketplace() {
  return (
    <PageShell
      testId="marketplace-page"
      eyebrow="Open Trading Floor"
      title={
        <>
          <span className="text-gradient-aurora">Marketplace</span>
        </>
      }
      description="Buy, sell, and trade cards with the entire Gachard universe. Peer-to-peer trades open soon."
    >
      {/* Coming soon banner */}
      <div
        className="relative overflow-hidden rounded-3xl p-8 sm:p-10 mb-12"
        style={{
          background:
            "linear-gradient(135deg, rgba(138,92,255,0.15), rgba(255,107,186,0.10) 50%, rgba(0,204,255,0.12))",
          border: "1px solid rgba(184,172,255,0.28)",
        }}
        data-testid="market-coming-soon"
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 15% 20%, rgba(184,172,255,0.3), transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(255,196,102,0.2), transparent 55%)",
          }}
        />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.4fr_1fr] items-center">
          <div>
            <div className="chip mb-5" data-testid="market-status-chip">
              <span className="chip-dot" />
              <span>Launching Season 1 — Coming Soon</span>
            </div>
            <h2 className="font-display uppercase text-3xl sm:text-4xl text-white mb-4 leading-tight">
              Peer-to-peer trading,{" "}
              <span className="text-gradient-gold">fully verified.</span>
            </h2>
            <p className="text-white/70 max-w-xl leading-relaxed">
              List cards for any price. Every trade is verified against the
              rarity signature — no counterfeits, no middlemen. Escrow
              is atomic, and payouts settle in credits instantly.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <FeatureRow
              n="01"
              t="Verified rarity"
              d="Every listing carries a verified rarity signature."
            />
            <FeatureRow
              n="02"
              t="Atomic escrow"
              d="No trust required — trade or cancel, no in-between."
            />
            <FeatureRow
              n="03"
              t="Global liquidity"
              d="Trade across 50+ countries with credits or tokens."
            />
          </div>
        </div>
      </div>

      {/* Preview grid */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p
            className="text-[0.72rem] uppercase tracking-[0.22em] mb-2"
            style={{ color: "var(--cosmic-violet)" }}
          >
            Sneak Peek
          </p>
          <h3 className="font-display uppercase text-2xl sm:text-3xl text-white">
            What you'll be trading
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
        {PREVIEW_CARDS.map((c) => (
          <div
            key={c.name}
            className="glass glass-hover overflow-hidden p-2.5"
            data-testid={`market-preview-${c.name.toLowerCase()}`}
          >
            <div
              className="relative aspect-[3/4] rounded-xl overflow-hidden mb-3"
              style={{
                background: `linear-gradient(180deg, rgba(11,14,26,0.2), rgba(11,14,26,0.85)), url(${c.img}) center/cover`,
              }}
            >
              <div
                className="absolute top-2 right-2 text-[0.55rem] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                style={{
                  background: "rgba(11,14,26,0.75)",
                  backdropFilter: "blur(6px)",
                  color: c.color,
                  border: `1px solid ${c.color}`,
                }}
              >
                {c.tier}
              </div>
            </div>
            <div className="px-1 pb-1">
              <div className="flex items-center justify-between">
                <p className="font-display uppercase text-white text-sm tracking-wider">
                  {c.name}
                </p>
              </div>
              <div className="mt-1 text-[0.7rem] uppercase tracking-widest text-white/50">
                From{" "}
                <span
                  className="font-bold"
                  style={{ color: "var(--aurora-gold)" }}
                >
                  {c.price}
                </span>{" "}
                Credit
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

function FeatureRow({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
      <span
        className="font-display text-lg shrink-0 w-10"
        style={{ color: "var(--cosmic-violet)" }}
      >
        {n}
      </span>
      <div>
        <p className="text-sm font-medium text-white">{t}</p>
        <p className="text-xs text-white/60 mt-0.5 leading-relaxed">{d}</p>
      </div>
    </div>
  );
}
