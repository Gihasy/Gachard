"use client";

import Image from "next/image";
import Link from "next/link";

const FEATURED_CARDS = [
  { id: "lumora-001", name: "Lumora", tier: "MYTHIC", img: "/cards/legendary-1.png", color: "var(--aurora-gold)" },
  { id: "pyrax-002",  name: "Pyrax",  tier: "EPIC",   img: "/cards/epic-1.png",      color: "var(--cosmic-violet)" },
  { id: "noxel-003",  name: "Noxel",  tier: "RARE",   img: "/cards/rare-1.png",      color: "var(--electric-blue)" },
  { id: "auren-004",  name: "Auren",  tier: "LEGENDARY", img: "/cards/legendary-2.png", color: "var(--aurora-gold)" },
] as const;

export default function HomeFeaturedCards() {
  return (
    <section className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 py-20" data-testid="featured-section">
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="text-[0.72rem] uppercase tracking-[0.22em] mb-3" style={{ color: "var(--cosmic-violet)" }}>
            Featured Cards
          </p>
          <h2 className="font-display text-3xl sm:text-4xl uppercase text-white">The Legends Await</h2>
        </div>
        <Link
          href="/koleksi"
          className="hidden sm:inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/70 hover:text-white transition-colors"
          data-testid="featured-view-all"
        >
          View All
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {FEATURED_CARDS.map((c, i) => (
          <div key={c.id} className="glass glass-hover group overflow-hidden p-3" data-testid={`featured-card-${c.name.toLowerCase()}`}>
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-4">
              <Image
                src={c.img}
                alt={c.name}
                fill
                sizes="(max-width: 1024px) 45vw, 25vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div
                className="absolute top-3 right-3 text-[0.6rem] font-bold uppercase tracking-widest px-2 py-1 rounded"
                style={{
                  background: "rgba(11,14,26,0.75)",
                  color: c.color,
                  border: `1px solid ${c.color}`,
                }}
              >
                {c.tier}
              </div>
            </div>
            <div className="px-2 pb-2">
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="font-display text-lg uppercase text-white" style={{ letterSpacing: "-0.01em" }}>
                  {c.name}
                </h3>
                <span className="text-[0.65rem] uppercase tracking-widest text-white/50">
                  #{String(i + 1).padStart(3, "0")}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-[0.65rem] uppercase tracking-wider text-white/50">
                <span>ATK {600 + i * 40}</span>
                <span>DEF {380 + i * 30}</span>
                <span>HP {800 + i * 20}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
