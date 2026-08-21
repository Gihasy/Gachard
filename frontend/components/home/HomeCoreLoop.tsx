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
                  width: "clamp(200px, 28vw, 340px)",
                  aspectRatio: "5/7",
                }}
              >
                <Image
                  src="/cards/digital-card.webp"
                  alt="Digital Gachard card"
                  fill
                  sizes="(max-width: 640px) 200px, (max-width: 1024px) 280px, 340px"
                  className="object-cover"
                />
              </div>
            </div>

            {/* Arrow center */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              {/* Print arrow (right) */}
              <div className="flex items-center gap-2">
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
                  <line x1="4" y1="12" x2="28" y2="12" stroke="#C9A84C" strokeWidth="1.5" />
                  <polyline points="24,6 30,12 24,18" stroke="#C9A84C" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <svg
                  width="24"
                  height="18"
                  viewBox="0 0 36 24"
                  fill="none"
                  className="sm:hidden"
                >
                  <line x1="4" y1="12" x2="28" y2="12" stroke="#C9A84C" strokeWidth="1.5" />
                  <polyline points="24,6 30,12 24,18" stroke="#C9A84C" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {/* Redeem arrow (left) */}
              <div className="flex items-center gap-2">
                <svg
                  width="36"
                  height="24"
                  viewBox="0 0 36 24"
                  fill="none"
                  className="hidden sm:block"
                >
                  <line x1="6" y1="12" x2="32" y2="12" stroke="#C9A84C" strokeWidth="1.5" />
                  <polyline points="10,6 4,12 10,18" stroke="#C9A84C" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <svg
                  width="24"
                  height="18"
                  viewBox="0 0 36 24"
                  fill="none"
                  className="sm:hidden"
                >
                  <line x1="6" y1="12" x2="32" y2="12" stroke="#C9A84C" strokeWidth="1.5" />
                  <polyline points="10,6 4,12 10,18" stroke="#C9A84C" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span
                  className="text-[0.65rem] sm:text-[0.7rem] uppercase tracking-[0.2em] font-semibold"
                  style={{ color: "#B89F5A" }}
                >
                  Redeem
                </span>
              </div>
            </div>

            {/* Physical card */}
            <div className="relative" style={{ transform: "rotate(8deg)" }}>
              <div
                className="relative overflow-hidden rounded-[16px]"
                style={{
                  width: "clamp(200px, 28vw, 340px)",
                  aspectRatio: "5/7",
                }}
              >
                <Image
                  src="/cards/real-card.webp"
                  alt="Physical Gachard card"
                  fill
                  sizes="(max-width: 640px) 200px, (max-width: 1024px) 280px, 340px"
                  className="object-cover"
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
