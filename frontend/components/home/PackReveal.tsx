"use client";

import Link from "next/link";

const RARITY_GLOW = ["", "glow-rare", "glow-epic", "glow-legendary"] as const;
const RARITY_COLORS = [
  "var(--rarity-common)",
  "var(--rarity-rare)",
  "var(--rarity-epic)",
  "var(--rarity-legendary)",
] as const;
const RARITY_LABELS = ["Common", "Rare", "Epic", "Legendary"] as const;

export interface RevealedCard {
  tokenId?: number | string;
  rarity: number;
  template?: {
    id?: string;
    name?: string;
    artworkUrl?: string;
  };
}

export interface RevealSuccess {
  cards: RevealedCard[];
  newBalance?: number;
  error?: undefined;
}

export interface RevealError {
  cards?: undefined;
  error: string;
}

export type RevealResult = RevealSuccess | RevealError;

interface PackRevealProps {
  result: RevealResult;
}

export default function PackReveal({ result }: PackRevealProps) {
  if ("error" in result && result.error) {
    return (
      <div
        className="mx-auto max-w-3xl mt-8 p-4 rounded-2xl text-center"
        style={{
          background: "rgba(255,107,186,0.1)",
          color: "var(--aurora-pink)",
          border: "1px solid rgba(255,107,186,0.3)",
        }}
        data-testid="pack-reveal-error"
      >
        {result.error}
      </div>
    );
  }

  const cards = result.cards ?? [];

  return (
    <section
      className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 py-14"
      data-testid="pack-reveal-section"
    >
      <h2 className="font-display uppercase text-3xl sm:text-4xl mb-8 text-center">
        <span className="text-gradient-aurora">Pack Opened!</span>
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {cards.map((card, i) => {
          const key = card.tokenId ?? card.template?.id ?? `${card.template?.name}-${i}`;
          const rarity = Math.max(0, Math.min(3, card.rarity)) as 0 | 1 | 2 | 3;
          return (
            <div
              key={key}
              className={`card-surface overflow-hidden ${RARITY_GLOW[rarity]}`}
              style={{ borderColor: RARITY_COLORS[rarity] }}
            >
              {card.template?.artworkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={card.template.artworkUrl}
                  alt={card.template.name ?? "card"}
                  className="w-full h-44 object-cover"
                />
              ) : (
                <div className="w-full h-44 flex items-center justify-center bg-white/5">
                  <span className="text-4xl">◆</span>
                </div>
              )}
              <div className="p-3 text-center">
                <p className="text-sm font-medium text-white">
                  {card.template?.name ?? "Unknown"}
                </p>
                <span
                  className={`tag tag-${RARITY_LABELS[rarity].toLowerCase()} mt-1 inline-block`}
                >
                  {RARITY_LABELS[rarity]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-sm text-center">
        <Link
          href="/collection"
          className="hover:text-white transition-colors"
          style={{ color: "var(--cosmic-violet)" }}
        >
          View in Collection →
        </Link>
      </p>
    </section>
  );
}
