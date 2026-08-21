"use client";

import Image from "next/image";

export default function HomeCoreLoop() {
  return (
    <section
      className="relative py-20 sm:py-28 overflow-hidden"
      data-testid="coreloop-section"
      style={{
        background: "linear-gradient(180deg, transparent 0%, rgba(11,15,26,0.95) 30%, rgba(11,15,26,0.95) 70%, transparent 100%)",
      }}
    >
      {/* Warm radial glow behind cards */}
      <div
        className="absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none"
        aria-hidden
        style={{
          background: "radial-gradient(ellipse, rgba(201,168,76,0.08) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        {/* Text content */}
        <div className="mb-12 sm:mb-16">
          <p
            className="text-[0.72rem] uppercase tracking-[0.25em] mb-3 font-semibold"
            style={{ color: "#C9A84C" }}
          >
            The Core Loop
          </p>
          <h2 className="font-display text-3xl sm:text-5xl lg:text-[3.5rem] uppercase leading-[0.95] mb-5">
            <span className="text-white">One Card. </span>
            <span
              style={{
                background: "linear-gradient(135deg, #D4A843, #E8C24A)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Two Worlds.
            </span>
          </h2>
          <p className="text-base sm:text-lg text-white/55 max-w-[560px] leading-relaxed">
            Every Gachard card starts digital. Print it into a real, holographic collectible — or redeem your physical card back into your digital collection, anytime.
          </p>
        </div>

        {/* Cards showcase */}
        <div className="flex flex-col items-center">
          <div className="relative flex items-center justify-center gap-4 sm:gap-8 lg:gap-12">
            {/* Digital card */}
            <div className="relative" style={{ transform: "rotate(-8deg)" }}>
              <div
                className="relative overflow-hidden rounded-[16px]"
                style={{
                  width: "clamp(160px, 22vw, 260px)",
                  aspectRatio: "5/7",
                  boxShadow: "0 25px 60px -15px rgba(201,168,76,0.3), 0 0 0 1px rgba(201,168,76,0.4), 0 0 40px -10px rgba(201,168,76,0.15)",
                }}
              >
                <Image
                  src="/cards/legendary-1.webp"
                  alt="Digital Gachard card"
                  fill
                  sizes="(max-width: 640px) 160px, (max-width: 1024px) 220px, 260px"
                  className="object-cover"
                />
              </div>
            </div>

            {/* Arrow center */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <span
                className="text-[0.65rem] sm:text-[0.7rem] uppercase tracking-[0.2em] font-semibold"
                style={{ color: "#B89F5A" }}
              >
                Print
              </span>
              <svg
                width="36"
                height="24"
                viewBox="0 0 36 24"
                fill="none"
                className="hidden sm:block"
              >
                <line x1="0" y1="12" x2="28" y2="12" stroke="#C9A84C" strokeWidth="1.5" />
                <polyline points="24,6 30,12 24,18" stroke="#C9A84C" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <svg
                width="24"
                height="18"
                viewBox="0 0 36 24"
                fill="none"
                className="sm:hidden"
              >
                <line x1="0" y1="12" x2="28" y2="12" stroke="#C9A84C" strokeWidth="1.5" />
                <polyline points="24,6 30,12 24,18" stroke="#C9A84C" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span
                className="text-[0.65rem] sm:text-[0.7rem] uppercase tracking-[0.2em] font-semibold"
                style={{ color: "#B89F5A" }}
              >
                Redeem
              </span>
            </div>

            {/* Physical card (holographic sleeve effect) */}
            <div className="relative" style={{ transform: "rotate(8deg)" }}>
              <div
                className="relative overflow-hidden rounded-[16px]"
                style={{
                  width: "clamp(160px, 22vw, 260px)",
                  aspectRatio: "5/7",
                  boxShadow: "0 25px 60px -15px rgba(64,224,208,0.15), 0 0 0 1px rgba(255,255,255,0.12)",
                }}
              >
                <Image
                  src="/cards/legendary-2.webp"
                  alt="Physical Gachard card in holographic sleeve"
                  fill
                  sizes="(max-width: 640px) 160px, (max-width: 1024px) 220px, 260px"
                  className="object-cover"
                />
                {/* Holographic overlay */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "linear-gradient(135deg, rgba(64,224,208,0.12) 0%, rgba(224,64,192,0.1) 30%, rgba(232,194,74,0.08) 60%, rgba(64,224,208,0.12) 100%)",
                    mixBlendMode: "color-dodge",
                  }}
                />
                {/* Holographic shimmer line */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.08) 55%, transparent 70%)",
                  }}
                />
                {/* Plastic case edge highlight */}
                <div
                  className="absolute inset-0 rounded-[16px] pointer-events-none"
                  style={{
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(255,255,255,0.05)",
                  }}
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
