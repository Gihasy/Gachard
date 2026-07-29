"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";

const RARITY_COLORS = [
  "var(--rarity-common)",
  "var(--rarity-rare)",
  "var(--rarity-epic)",
  "var(--rarity-legendary)",
] as const;
const RARITY_RGB = [
  "156,163,175",
  "0,204,255",
  "184,172,255",
  "255,196,102",
] as const;
const RARITY_LABELS = ["Common", "Rare", "Epic", "Legendary"] as const;
const AURA = ["", "aura-rare", "aura-epic", "aura-legendary"] as const;

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
  /** Optional label for the closed pack (e.g. "Standard Pack") */
  packLabel?: string;
}

type RevealPhase = "ready" | "bursting" | "revealing" | "done";

/** A ring of particles that fly outward from the pack on burst. */
function SparkBurst() {
  const sparks = useMemo(() => {
    const arr = [];
    const rgbs = ["255,196,102", "184,172,255", "0,204,255", "255,107,186", "255,255,255"];
    for (let i = 0; i < 26; i++) {
      const angle = (i / 26) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 120 + Math.random() * 200;
      arr.push({
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        dur: 700 + Math.random() * 700,
        size: 4 + Math.random() * 8,
        color: rgbs[Math.floor(Math.random() * rgbs.length)],
      });
    }
    return arr;
  }, []);

  return (
    <>
      {sparks.map((s, i) => (
        <span
          key={i}
          className="spark"
          style={{
            // @ts-expect-error CSS vars
            "--dx": `${s.dx}px`,
            "--dy": `${s.dy}px`,
            "--dur": `${s.dur}ms`,
            width: s.size,
            height: s.size,
            background: `rgb(${s.color})`,
            boxShadow: `0 0 12px rgba(${s.color},0.9)`,
          }}
        />
      ))}
    </>
  );
}

export default function PackReveal({ result, packLabel = "Your Pack" }: PackRevealProps) {
  const [phase, setPhase] = useState<RevealPhase>("ready");
  const [revealedCount, setRevealedCount] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const cards = "cards" in result && result.cards ? result.cards : [];
  // Sort by rarity ascending (Common first, Legendary last) for building suspense.
  const sortedCards = useMemo(
    () => [...cards].sort((a, b) => a.rarity - b.rarity),
    [cards]
  );
  const bestRarity = useMemo(
    () => sortedCards.reduce((m, c) => Math.max(m, c.rarity), 0),
    [sortedCards]
  );

  useEffect(() => {
    return () => timers.current.forEach(clearTimeout);
  }, []);

  // Sequential card reveal once we enter the revealing phase.
  useEffect(() => {
    if (phase !== "revealing") return;
    if (revealedCount >= sortedCards.length) {
      const t = setTimeout(() => setPhase("done"), 500);
      timers.current.push(t);
      return;
    }
    const timer = setTimeout(() => setRevealedCount((c) => c + 1), 380);
    timers.current.push(timer);
    return () => clearTimeout(timer);
  }, [phase, revealedCount, sortedCards.length]);

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

  const handleOpen = () => {
    setPhase("bursting");
    // burst finishes → start revealing cards
    const t = setTimeout(() => {
      setRevealedCount(0);
      setPhase("revealing");
    }, 1400);
    timers.current.push(t);
  };

  return (
    <section
      className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 py-14"
      data-testid="pack-reveal-section"
    >
      {/* ─── READY / BURSTING: the closed pack ─── */}
      {(phase === "ready" || phase === "bursting") && (
        <div className="text-center">
          <h2 className="font-display uppercase text-3xl sm:text-4xl mb-3">
            <span className="text-gradient-aurora">Pack Ready</span>
          </h2>
          <p className="text-white/55 text-sm mb-10 tracking-wide">
            {phase === "bursting" ? "Unsealing…" : "Tap the pack to reveal your pulls"}
          </p>

          <div className="relative mx-auto flex items-center justify-center" style={{ height: 420 }}>
            {/* rotating light rays */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px]">
              <div className="pack-rays" />
            </div>
            {/* ambient glow */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full pulse-glow"
              aria-hidden
              style={{
                background:
                  "radial-gradient(circle, rgba(255,196,102,0.35) 0%, rgba(184,172,255,0.22) 40%, transparent 70%)",
                filter: "blur(24px)",
              }}
            />

            {/* burst FX */}
            {phase === "bursting" && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <SparkBurst />
                <div className="burst-flash" style={{ animationDelay: "700ms" }} />
                <div className="burst-ring" style={{ animationDelay: "780ms" }} />
                <div className="burst-ring delay-1" style={{ animationDelay: "780ms" }} />
              </div>
            )}

            {/* the pack itself */}
            <button
              onClick={handleOpen}
              disabled={phase === "bursting"}
              className={`relative z-10 group ${phase === "bursting" ? "pack-shake" : "pack-breathe"}`}
              style={{ cursor: phase === "bursting" ? "default" : "pointer" }}
              data-testid="open-pack-btn"
              aria-label="Open pack"
            >
              <div
                className="relative overflow-hidden rounded-3xl"
                style={{
                  width: 240,
                  aspectRatio: "5/7",
                  background:
                    "linear-gradient(160deg, #1a1740 0%, #241a52 45%, #3a1d5c 100%)",
                  border: "1px solid rgba(255,196,102,0.35)",
                  boxShadow:
                    "0 40px 90px -30px rgba(255,196,102,0.55), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.2)",
                  opacity: phase === "bursting" ? 0 : 1,
                  transition: "opacity 300ms ease 700ms",
                }}
              >
                {/* diagonal sheen */}
                <span
                  className="absolute inset-y-0 w-1/3 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)",
                    animation: "packSheen 3.5s ease-in-out infinite",
                  }}
                />
                {/* emblem */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--aurora-gold), var(--aurora-pink))",
                      boxShadow: "0 10px 30px -6px rgba(255,196,102,0.6)",
                    }}
                  >
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0B0E1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15 8.5 22 9.3 17 14 18.3 21 12 17.5 5.7 21 7 14 2 9.3 9 8.5 12 2" />
                    </svg>
                  </div>
                  <p className="font-display uppercase text-lg text-white tracking-wide text-center leading-tight">
                    {packLabel}
                  </p>
                  <span className="chip"><span className="chip-dot" />Sealed</span>
                </div>
                {/* grain */}
                <span className="grid-lines opacity-40" />
              </div>
            </button>
          </div>

          {phase === "ready" && (
            <button onClick={handleOpen} className="btn-gold mt-8" data-testid="open-pack-cta">
              Open Pack
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* ─── REVEALING / DONE: the pulled cards ─── */}
      {(phase === "revealing" || phase === "done") && (
        <>
          <div className="text-center mb-10">
            <h2 className="font-display uppercase text-3xl sm:text-4xl mb-2">
              <span className="text-gradient-aurora">
                {phase === "done" ? "Pack Opened" : "Revealing…"}
              </span>
            </h2>
            {phase === "done" && bestRarity >= 2 && (
              <p
                className="label-pop text-sm uppercase tracking-[0.2em] font-semibold"
                style={{ color: RARITY_COLORS[bestRarity] }}
                data-testid="best-pull-banner"
              >
                ✦ {RARITY_LABELS[bestRarity]} pull! ✦
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5 justify-items-center">
            {sortedCards.map((card, i) => {
              const key = card.tokenId ?? card.template?.id ?? `${card.template?.name}-${i}`;
              const rarity = Math.max(0, Math.min(3, card.rarity)) as 0 | 1 | 2 | 3;
              const isRevealed = i < revealedCount;

              if (!isRevealed) {
                return (
                  <div
                    key={key}
                    className="w-full max-w-[190px] rounded-2xl"
                    style={{
                      aspectRatio: "5/7",
                      background: "linear-gradient(135deg, #14162e, #1b1f3a)",
                      border: "1px dashed rgba(255,255,255,0.12)",
                      opacity: 0.5,
                    }}
                    data-testid={`card-reveal-${i}`}
                  />
                );
              }

              return (
                <div
                  key={key}
                  className="card-pop w-full max-w-[190px]"
                  style={{ animationDelay: `${(i - Math.max(0, revealedCount - 1)) * 40}ms` }}
                  data-testid={`card-reveal-${i}`}
                >
                  <div
                    className={`shine-sweep relative rounded-2xl overflow-hidden ${AURA[rarity]}`}
                    style={{
                      aspectRatio: "5/7",
                      border: `2px solid ${RARITY_COLORS[rarity]}`,
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
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: `rgba(${RARITY_RGB[rarity]},0.12)` }}
                      >
                        <span className="text-4xl" style={{ color: RARITY_COLORS[rarity] }}>◆</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 p-3 text-center bg-gradient-to-t from-black/85 via-black/40 to-transparent">
                      <p className="text-sm font-medium text-white truncate">
                        {card.template?.name ?? "Unknown"}
                      </p>
                      <span className={`tag tag-${RARITY_LABELS[rarity].toLowerCase()} mt-1 inline-block`}>
                        {RARITY_LABELS[rarity]}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {phase === "done" && (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/collection" className="btn-primary" data-testid="reveal-view-collection">
                View in Collection
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}
