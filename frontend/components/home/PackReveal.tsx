"use client";

import { useState, useEffect } from "react";
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

type RevealPhase = "ready" | "revealing" | "done";

export default function PackReveal({ result }: PackRevealProps) {
  const [phase, setPhase] = useState<RevealPhase>("ready");
  const [revealedCount, setRevealedCount] = useState(0);

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
  // Sort by rarity ascending (Common first, Legendary last) for suspense
  const sortedCards = [...cards].sort((a, b) => a.rarity - b.rarity);

  // Sequential reveal
  useEffect(() => {
    if (phase !== "revealing") return;
    if (revealedCount >= sortedCards.length) {
      setPhase("done");
      return;
    }
    const timer = setTimeout(() => {
      setRevealedCount((c) => c + 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [phase, revealedCount, sortedCards.length]);

  const handleOpen = () => {
    setPhase("revealing");
    setRevealedCount(0);
  };

  return (
    <section
      className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 py-14"
      data-testid="pack-reveal-section"
    >
      {/* Ready phase: show pack */}
      {phase === "ready" && (
        <div className="text-center">
          <h2 className="font-display uppercase text-3xl sm:text-4xl mb-8">
            <span className="text-gradient-aurora">Pack Ready!</span>
          </h2>
          <button
            onClick={handleOpen}
            className="px-12 py-4 rounded-2xl text-lg font-display uppercase tracking-wider transition-all hover:scale-105"
            style={{
              background: "linear-gradient(135deg, var(--aurora-gold), var(--aurora-pink))",
              color: "#fff",
              boxShadow: "0 8px 32px rgba(255,196,102,0.3)",
            }}
            data-testid="open-pack-btn"
          >
            Open Pack
          </button>
        </div>
      )}

      {/* Revealing / Done phase: show cards */}
      {(phase === "revealing" || phase === "done") && (
        <>
          <h2 className="font-display uppercase text-3xl sm:text-4xl mb-8 text-center">
            <span className="text-gradient-aurora">
              {phase === "done" ? "Pack Opened!" : "Opening..."}
            </span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {sortedCards.map((card, i) => {
              const key = card.tokenId ?? card.template?.id ?? `${card.template?.name}-${i}`;
              const rarity = Math.max(0, Math.min(3, card.rarity)) as 0 | 1 | 2 | 3;
              const isRevealed = i < revealedCount;

              return (
                <div
                  key={key}
                  className="relative"
                  style={{ perspective: "1000px" }}
                  data-testid={`card-reveal-${i}`}
                >
                  <div
                    className="relative w-full transition-transform duration-500 ease-out"
                    style={{
                      transformStyle: "preserve-3d",
                      transform: isRevealed ? "rotateY(0deg)" : "rotateY(180deg)",
                      aspectRatio: "5/7",
                    }}
                  >
                    {/* Card back */}
                    <div
                      className="absolute inset-0 rounded-2xl flex items-center justify-center"
                      style={{
                        backfaceVisibility: "hidden",
                        background: "linear-gradient(135deg, #1a1a2e, #16213e)",
                        border: "2px solid rgba(255,255,255,0.1)",
                        transform: "rotateY(180deg)",
                      }}
                    >
                      <span className="text-4xl opacity-50">?</span>
                    </div>

                    {/* Card front */}
                    <div
                      className={`absolute inset-0 rounded-2xl overflow-hidden ${RARITY_GLOW[rarity]}`}
                      style={{
                        backfaceVisibility: "hidden",
                        border: `2px solid ${RARITY_COLORS[rarity]}`,
                        transform: "rotateY(0deg)",
                      }}
                    >
                      {card.template?.artworkUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={card.template.artworkUrl}
                          alt={card.template.name ?? "card"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-white/5">
                          <span className="text-4xl">◆</span>
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 p-3 text-center bg-gradient-to-t from-black/80 to-transparent">
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
                  </div>
                </div>
              );
            })}
          </div>

          {phase === "done" && (
            <p className="mt-8 text-sm text-center">
              <Link
                href="/collection"
                className="hover:text-white transition-colors"
                style={{ color: "var(--cosmic-violet)" }}
              >
                View in Collection →
              </Link>
            </p>
          )}
        </>
      )}
    </section>
  );
}
