"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const RARITY_GLOW = ["", "glow-rare", "glow-epic", "glow-legendary"];
const RARITY_COLORS = [
  "var(--rarity-common)",
  "var(--rarity-rare)",
  "var(--rarity-epic)",
  "var(--rarity-legendary)",
];
const RARITY_LABELS = ["Common", "Rare", "Epic", "Legendary"];

const FEATURED_CARDS = [
  { name: "Lumora", tier: "MYTHIC", img: "/cards/legendary-1.png", color: "var(--aurora-gold)" },
  { name: "Pyrax", tier: "EPIC", img: "/cards/epic-1.png", color: "var(--cosmic-violet)" },
  { name: "Noxel", tier: "RARE", img: "/cards/rare-1.png", color: "var(--electric-blue)" },
  { name: "Auren", tier: "LEGENDARY", img: "/cards/legendary-2.png", color: "var(--aurora-gold)" },
];

const HERO_CARDS = [
  { img: "/cards/epic-1.png", name: "PYRAX", tier: "EPIC", stat: "ATK 620 · DEF 410", rot: -14, x: -180, y: 30, z: 1 },
  { img: "/cards/legendary-1.png", name: "LUMORA", tier: "MYTHIC", stat: "ATK 860 · DEF 620", rot: 0, x: 0, y: 0, z: 3 },
  { img: "/cards/rare-1.png", name: "NOXEL", tier: "RARE", stat: "ATK 540 · DEF 360", rot: 14, x: 180, y: 30, z: 1 },
];

const WHY = [
  { title: "True Ownership", desc: "Your cards, your assets. Built on trust and security." },
  { title: "Play to Win", desc: "Strategic battles. Endless possibilities." },
  { title: "Open Market", desc: "Trade freely. Anytime, anywhere." },
  { title: "Built for Community", desc: "Together we grow the Gachard universe." },
];

const STEPS = [
  { n: "01", title: "Register", desc: "Create your account and enter the universe." },
  { n: "02", title: "Collect", desc: "Open packs and collect rare cards." },
  { n: "03", title: "Play", desc: "Build your deck and battle in arenas." },
  { n: "04", title: "Trade", desc: "Trade cards in the open marketplace." },
  { n: "05", title: "Grow", desc: "Level up your bond and unlock more." },
];

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<{ user_id: string; username: string } | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [reveal, setReveal] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      fetch(`/api/credits?userId=${u.user_id}`)
        .then((r) => r.json())
        .then((d) => setBalance(d.balance))
        .catch(() => {});
    }
  }, []);

  const handleBuyPack = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setLoading(true);
    setReveal(null);
    try {
      const res = await fetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.user_id }),
      });
      const data = await res.json();
      if (res.ok) {
        setBalance(data.newBalance);
        setReveal(data);
      } else {
        setReveal({ error: data.error || "Gagal beli pack" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="home-page">
      {/* ═══════════════ HERO ═══════════════ */}
      <section
        className="relative overflow-hidden"
        data-testid="hero-section"
      >
        <div className="grid-lines" />
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 pt-14 pb-20 lg:pt-20 lg:pb-28">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-14 lg:gap-8 items-center">
            {/* Copy column */}
            <div className="relative z-10">
              <div className="chip reveal reveal-1 mb-6" data-testid="hero-chip">
                <span className="chip-dot" />
                <span>Season 1 — Cosmic Genesis is live</span>
              </div>

              <h1
                className="font-display uppercase leading-[0.92] text-[clamp(3rem,7vw,6.25rem)] mb-6"
                style={{ letterSpacing: "-0.045em" }}
                data-testid="hero-headline"
              >
                <span
                  className="block reveal reveal-1"
                  style={{ color: "var(--cosmic-violet)" }}
                >
                  Collect.
                </span>
                <span
                  className="block reveal reveal-2"
                  style={{ color: "var(--electric-blue)" }}
                >
                  Play.
                </span>
                <span
                  className="block reveal reveal-3"
                  style={{ color: "var(--aurora-gold)" }}
                >
                  Trade.
                </span>
              </h1>

              <p
                className="reveal reveal-4 text-lg sm:text-xl text-white/85 mb-3 font-medium"
                data-testid="hero-tagline"
              >
                One bond. Infinite legends.
              </p>
              <p
                className="reveal reveal-4 text-base text-white/60 max-w-[520px] mb-9 leading-relaxed"
              >
                Enter the world of Gachard and build your legacy with powerful
                cards and trusted connections that bridge the physical and
                digital.
              </p>

              <div
                className="reveal reveal-5 flex flex-wrap items-center gap-4 mb-12"
                data-testid="hero-cta-row"
              >
                <button
                  onClick={handleBuyPack}
                  disabled={loading}
                  className="btn-primary disabled:opacity-60"
                  data-testid="hero-explore-cards-btn"
                >
                  {loading ? "Opening…" : "Explore Cards"}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12h14M13 5l7 7-7 7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <Link
                  href="/marketplace"
                  className="btn-ghost"
                  data-testid="hero-play-now-btn"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Play Now
                </Link>
              </div>

              {/* Stats */}
              <div
                className="reveal reveal-5 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-[560px]"
                data-testid="hero-stats"
              >
                {[
                  { v: "12K+", l: "Collectors" },
                  { v: "45K+", l: "Cards Minted" },
                  { v: "3.2K+", l: "Matches Played" },
                  { v: "50+", l: "Countries" },
                ].map((s) => (
                  <div key={s.l}>
                    <div
                      className="font-display text-2xl sm:text-[1.75rem] mb-1"
                      style={{ color: "var(--cosmic-violet)" }}
                    >
                      {s.v}
                    </div>
                    <div className="text-[0.7rem] uppercase tracking-[0.18em] text-white/50">
                      {s.l}
                    </div>
                  </div>
                ))}
              </div>

              {user && balance !== null && (
                <div
                  className="mt-8 inline-flex items-center gap-3 px-5 py-2.5 rounded-full"
                  style={{
                    background: "rgba(184,172,255,0.08)",
                    border: "1px solid rgba(184,172,255,0.22)",
                  }}
                  data-testid="hero-balance-chip"
                >
                  <span className="text-xs uppercase tracking-widest text-white/60">
                    Balance
                  </span>
                  <span
                    className="font-display text-lg"
                    style={{ color: "var(--aurora-gold)" }}
                  >
                    {balance} Credit
                  </span>
                </div>
              )}
            </div>

            {/* Hero visual */}
            <div className="relative h-[440px] sm:h-[520px] lg:h-[560px]" data-testid="hero-visual">
              {/* Central glow */}
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full pulse-glow"
                aria-hidden
                style={{
                  background:
                    "radial-gradient(circle, rgba(184,172,255,0.35) 0%, rgba(255,107,186,0.18) 40%, transparent 70%)",
                  filter: "blur(20px)",
                }}
              />
              {/* Orbit ring */}
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full"
                aria-hidden
                style={{
                  border: "1px dashed rgba(184,172,255,0.25)",
                  animation: "spin 40s linear infinite",
                }}
              />
              <style>{`@keyframes spin { to { transform: translate(-50%, -50%) rotate(360deg); } }`}</style>

              {/* Cards */}
              <div className="absolute inset-0">
                {HERO_CARDS.map((c, i) => (
                  <div
                    key={c.name}
                    className="absolute left-1/2 top-1/2"
                    style={{
                      transform: `translate(calc(-50% + ${c.x}px), calc(-50% + ${c.y}px))`,
                      zIndex: c.z,
                    }}
                  >
                    <div
                      className="floaty"
                      style={{
                        // @ts-expect-error CSS var
                        "--r": `${c.rot}deg`,
                        animationDelay: i === 0 ? "-1.5s" : i === 2 ? "-3s" : "0s",
                      }}
                    >
                      <div
                        className="relative overflow-hidden rounded-[18px]"
                        style={{
                          width: i === 1 ? 220 : 190,
                          height: i === 1 ? 310 : 270,
                          boxShadow:
                            i === 1
                              ? "0 30px 80px -20px rgba(255,107,186,0.55), 0 0 0 1px rgba(255,255,255,0.15)"
                              : "0 20px 55px -18px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)",
                        }}
                        data-testid={`hero-card-${c.name.toLowerCase()}`}
                      >
                      <Image
                        src={c.img}
                        alt={c.name}
                        fill
                        sizes="220px"
                        className="object-cover"
                      />
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(180deg, transparent 55%, rgba(11,14,26,0.85) 100%)",
                        }}
                      />
                      <div className="absolute top-3 right-3">
                        <span
                          className="text-[0.6rem] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                          style={{
                            background: "rgba(11,14,26,0.65)",
                            backdropFilter: "blur(6px)",
                            color:
                              c.tier === "MYTHIC"
                                ? "var(--aurora-gold)"
                                : c.tier === "EPIC"
                                ? "var(--cosmic-violet)"
                                : "var(--electric-blue)",
                            border: `1px solid ${
                              c.tier === "MYTHIC"
                                ? "var(--aurora-gold)"
                                : c.tier === "EPIC"
                                ? "var(--cosmic-violet)"
                                : "var(--electric-blue)"
                            }`,
                          }}
                        >
                          {c.tier}
                        </span>
                      </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="hr-glow" />
      </section>

      {/* ═══════════════ REVEAL RESULT (if triggered) ═══════════════ */}
      {reveal && !reveal.error && (
        <section
          className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 py-14"
          data-testid="pack-reveal-section"
        >
          <h2 className="font-display uppercase text-3xl sm:text-4xl mb-8 text-center">
            <span className="text-gradient-aurora">Pack Opened!</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {reveal.cards?.map((card: any, i: number) => (
              <div
                key={i}
                className={`card-surface overflow-hidden ${RARITY_GLOW[card.rarity]}`}
                style={{ borderColor: RARITY_COLORS[card.rarity] }}
              >
                {card.template?.artworkUrl ? (
                  <img
                    src={card.template.artworkUrl}
                    alt={card.template.name}
                    className="w-full h-44 object-cover"
                  />
                ) : (
                  <div className="w-full h-44 flex items-center justify-center bg-white/5">
                    <span className="text-4xl">◆</span>
                  </div>
                )}
                <div className="p-3 text-center">
                  <p className="text-sm font-medium text-white">
                    {card.template?.name}
                  </p>
                  <span className={`tag tag-${RARITY_LABELS[card.rarity].toLowerCase()} mt-1 inline-block`}>
                    {RARITY_LABELS[card.rarity]}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-center">
            <Link
              href="/koleksi"
              className="text-white/70 hover:text-white transition-colors"
              style={{ color: "var(--cosmic-violet)" }}
            >
              View in Collection →
            </Link>
          </p>
        </section>
      )}
      {reveal?.error && (
        <div
          className="mx-auto max-w-3xl mt-8 p-4 rounded-2xl text-center"
          style={{
            background: "rgba(255,107,186,0.1)",
            color: "var(--aurora-pink)",
            border: "1px solid rgba(255,107,186,0.3)",
          }}
          data-testid="pack-reveal-error"
        >
          {reveal.error}
        </div>
      )}

      {/* ═══════════════ FEATURED CARDS ═══════════════ */}
      <section
        className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 py-20"
        data-testid="featured-section"
      >
        <div className="flex items-end justify-between mb-10">
          <div>
            <p
              className="text-[0.72rem] uppercase tracking-[0.22em] mb-3"
              style={{ color: "var(--cosmic-violet)" }}
            >
              Featured Cards
            </p>
            <h2 className="font-display text-3xl sm:text-4xl uppercase text-white">
              The Legends Await
            </h2>
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
            <div
              key={c.name}
              className="glass glass-hover group overflow-hidden p-3"
              data-testid={`featured-card-${c.name.toLowerCase()}`}
            >
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
                  <h3
                    className="font-display text-lg uppercase text-white"
                    style={{ letterSpacing: "-0.01em" }}
                  >
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

      {/* ═══════════════ WHY GACHARD ═══════════════ */}
      <section
        className="relative py-20"
        data-testid="why-section"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(15,19,36,0.6) 50%, transparent 100%)",
        }}
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="text-center mb-14">
            <p
              className="text-[0.72rem] uppercase tracking-[0.22em] mb-3"
              style={{ color: "var(--cosmic-violet)" }}
            >
              Why Gachard?
            </p>
            <h2 className="font-display text-3xl sm:text-5xl uppercase text-white max-w-3xl mx-auto">
              Built for players.{" "}
              <span className="text-gradient-aurora">Owned by you.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {WHY.map((w, i) => {
              const strokeColor = ["#B8ACFF", "#FF6BBA", "#00CCFF", "#FFC466"][i];
              return (
                <div
                  key={w.title}
                  className="glass glass-hover p-7"
                  data-testid={`why-card-${i}`}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 relative"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(184,172,255,0.15), rgba(255,107,186,0.08))",
                      border: `1px solid ${strokeColor}55`,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 24px -6px ${strokeColor}40`,
                    }}
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style={{ color: strokeColor }}>
                      <defs>
                        <linearGradient id={`g-icon-${i}`} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor={strokeColor} />
                          <stop offset="100%" stopColor="#FFFFFF" />
                        </linearGradient>
                      </defs>
                      <g stroke={`url(#g-icon-${i})`} strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        {i === 0 && (
                          <>
                            <path d="M12 3l7.5 3.5v5.5c0 4.5-3.2 8.5-7.5 9.5-4.3-1-7.5-5-7.5-9.5V6.5L12 3z" />
                            <path d="M9 12l2 2 4-4" />
                          </>
                        )}
                        {i === 1 && (
                          <>
                            <path d="M14.5 5.5L20 11l-9 9-5.5-5.5L14.5 5.5z" />
                            <path d="M5.5 14.5L11 20" />
                            <circle cx="17" cy="8.5" r="1.4" />
                          </>
                        )}
                        {i === 2 && (
                          <>
                            <path d="M4 9h16l-1.4 9.5a2 2 0 0 1-2 1.7H7.4a2 2 0 0 1-2-1.7L4 9z" />
                            <path d="M8 9V6a4 4 0 0 1 8 0v3" />
                          </>
                        )}
                        {i === 3 && (
                          <>
                            <circle cx="9" cy="9" r="3" />
                            <circle cx="17" cy="10" r="2.4" />
                            <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" />
                            <path d="M15.5 20c0.2-2.2 1.9-4 4.5-4" />
                          </>
                        )}
                      </g>
                    </svg>
                  </div>
                  <h3 className="font-display uppercase text-white text-[0.95rem] tracking-wider mb-2">
                    {w.title}
                  </h3>
                  <p className="text-sm text-white/60 leading-relaxed">{w.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section
        className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 py-20"
        data-testid="how-section"
      >
        <div className="mb-12">
          <p
            className="text-[0.72rem] uppercase tracking-[0.22em] mb-3"
            style={{ color: "var(--cosmic-violet)" }}
          >
            How It Works
          </p>
          <h2 className="font-display text-3xl sm:text-5xl uppercase text-white max-w-2xl">
            From <span className="text-gradient-gold">zero to legend</span> in
            five steps.
          </h2>
        </div>

        <div className="relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className="relative"
              data-testid={`step-${s.n}`}
            >
              <div
                className="glass p-5 h-full transition-all duration-300 hover:border-white/25"
                style={{ minHeight: "170px" }}
              >
                <div
                  className="font-display text-3xl mb-3"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--cosmic-violet), var(--aurora-pink), var(--electric-blue))",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {s.n}
                </div>
                <h3 className="font-display uppercase text-white text-sm tracking-wider mb-2">
                  {s.title}
                </h3>
                <p className="text-xs text-white/60 leading-relaxed">{s.desc}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="hidden lg:flex absolute top-1/2 -right-3 z-10 w-6 h-6 items-center justify-center rounded-full"
                  style={{
                    background: "rgba(11,14,26,0.9)",
                    border: "1px solid rgba(184,172,255,0.4)",
                    color: "var(--cosmic-violet)",
                    transform: "translateY(-50%)",
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════ CTA BAND ═══════════════ */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 py-16">
        <div
          className="relative overflow-hidden rounded-3xl p-10 sm:p-14"
          style={{
            background:
              "linear-gradient(135deg, rgba(138,92,255,0.18), rgba(255,107,186,0.12) 45%, rgba(0,204,255,0.15))",
            border: "1px solid rgba(184,172,255,0.28)",
          }}
          data-testid="cta-band"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 20% 30%, rgba(184,172,255,0.25), transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(255,196,102,0.18), transparent 60%)",
            }}
          />
          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.4fr_1fr] items-center">
            <div>
              <h3 className="font-display uppercase text-3xl sm:text-4xl text-white mb-3 leading-tight">
                Your first pack is{" "}
                <span className="text-gradient-gold">waiting for you.</span>
              </h3>
              <p className="text-white/70 max-w-xl">
                Sign up in seconds. Open your first Cosmic Genesis pack and
                start building your legacy in the Gachard universe.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 justify-start lg:justify-end">
              <button
                onClick={handleBuyPack}
                disabled={loading}
                className="btn-gold disabled:opacity-60"
                data-testid="cta-open-pack-btn"
              >
                {loading ? "Opening…" : "Open First Pack"}
              </button>
              <Link href="/marketplace" className="btn-ghost" data-testid="cta-explore-market-btn">
                Explore Market
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
