"use client";

import Image from "next/image";

const STEPS = [
  { n: "01", title: "Register", desc: "Create your account and enter the universe." },
  { n: "02", title: "Collect",  desc: "Open packs and collect rare cards." },
  { n: "03", title: "Play",     desc: "Build your deck and battle in arenas." },
  { n: "04", title: "Trade",    desc: "Buy, sell, and auction your cards." },
  { n: "05", title: "Grow",     desc: "Level up your bond and unlock more." },
] as const;

export default function HomeHowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 py-20" data-testid="how-section">
      <div className="mb-12">
        <p className="text-[0.72rem] uppercase tracking-[0.22em] mb-3" style={{ color: "var(--cosmic-violet)" }}>
          How It Works
        </p>
        <h2 className="font-display text-3xl sm:text-5xl uppercase text-white max-w-2xl">
          From <span className="text-gradient-gold">zero to legend</span> in five steps.
        </h2>
      </div>

      <div className="relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {STEPS.map((s, i) => (
          <div key={s.n} className="relative" data-testid={`step-${s.n}`}>
            <div className="glass p-3 sm:p-5 h-full transition-all duration-300 hover:border-white/25" style={{ minHeight: "140px" }}>
              <div
                className="font-display text-2xl sm:text-3xl mb-2 sm:mb-3"
                style={{
                  background: "linear-gradient(135deg, var(--cosmic-violet), var(--aurora-pink), var(--electric-blue))",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {s.n}
              </div>
              <h3 className="font-display uppercase text-white text-xs sm:text-sm tracking-wider mb-1.5 sm:mb-2">{s.title}</h3>
              <p className="text-[0.65rem] sm:text-xs text-white/60 leading-relaxed">{s.desc}</p>
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

      {/* Digital <-> Physical MVP showcase */}
      <div
        className="glass mt-10 sm:mt-14 p-5 sm:p-10 relative overflow-hidden"
        data-testid="digital-physical-loop"
      >
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: "var(--aurora-gold)" }}
        />
        <div className="relative mb-8 sm:mb-10 text-center sm:text-left">
          <p className="text-[0.72rem] uppercase tracking-[0.22em] mb-3" style={{ color: "var(--aurora-gold)" }}>
            The Core Loop
          </p>
          <h3 className="font-display text-2xl sm:text-4xl uppercase text-white max-w-2xl mx-auto sm:mx-0">
            One card. <span className="text-gradient-gold">Two worlds.</span>
          </h3>
          <p className="text-white/60 text-sm sm:text-base mt-3 max-w-xl mx-auto sm:mx-0">
            Every Gachard card starts digital. Print it into a real, holographic
            collectible — or redeem your physical card back into your digital collection, anytime.
          </p>
        </div>

        <div className="relative flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-6">
          {/* Digital card */}
          <div className="flex flex-col items-center gap-5 w-full max-w-[220px] sm:max-w-[240px]" data-testid="loop-digital-card">
            <div className="floaty" style={{ "--r": "-6deg" } as React.CSSProperties}>
              <div className="relative w-[190px] sm:w-[210px]" style={{ aspectRatio: "4/5.65" }}>
                <Image
                  src="/how-it-works/digital-card.webp"
                  alt="Digital collectible card"
                  fill
                  sizes="(max-width: 640px) 55vw, 210px"
                  className="object-contain"
                  style={{ filter: "drop-shadow(0 25px 45px rgba(0,204,255,0.35))" }}
                />
              </div>
            </div>
            <span
              className="text-[0.65rem] uppercase tracking-[0.2em] font-semibold px-3 py-1 rounded-full"
              style={{ color: "var(--electric-blue)", border: "1px solid rgba(0,204,255,0.4)", background: "rgba(0,204,255,0.08)" }}
            >
              Digital Card
            </span>
          </div>

          {/* Loop connector */}
          <div className="flex sm:flex-col items-center justify-center gap-2 sm:gap-3 py-2 sm:py-0" data-testid="loop-connector">
            <span className="hidden sm:block text-[0.6rem] uppercase tracking-[0.18em] text-white/50">Print</span>
            <div
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: "rgba(11,14,26,0.9)",
                border: "1.5px solid rgba(255,196,102,0.45)",
                boxShadow: "0 0 24px -6px var(--aurora-gold)",
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style={{ color: "var(--aurora-gold)" }}>
                <path
                  d="M3 8h13M12 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M21 16H8M12 20l-4-4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="hidden sm:block text-[0.6rem] uppercase tracking-[0.18em] text-white/50">Redeem</span>
            <span className="sm:hidden text-[0.6rem] uppercase tracking-[0.18em] text-white/50">Print / Redeem</span>
          </div>

          {/* Physical card */}
          <div className="flex flex-col items-center gap-5 w-full max-w-[220px] sm:max-w-[240px]" data-testid="loop-physical-card">
            <div className="floaty" style={{ "--r": "-6deg" } as React.CSSProperties}>
              <div className="relative w-[190px] sm:w-[210px]" style={{ aspectRatio: "4/6" }}>
                <Image
                  src="/how-it-works/physical-card-v2.webp"
                  alt="Physical holographic collectible card"
                  fill
                  sizes="(max-width: 640px) 55vw, 210px"
                  className="object-contain"
                  style={{ filter: "drop-shadow(0 25px 45px rgba(255,196,102,0.35))" }}
                />
              </div>
            </div>
            <span
              className="text-[0.65rem] uppercase tracking-[0.2em] font-semibold px-3 py-1 rounded-full"
              style={{ color: "var(--aurora-gold)", border: "1px solid rgba(255,196,102,0.4)", background: "rgba(255,196,102,0.08)" }}
            >
              Physical Card
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
