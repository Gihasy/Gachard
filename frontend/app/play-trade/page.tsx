"use client";

import Link from "next/link";
import PageShell from "@/components/PageShell";

export default function PlayTradePage() {
  return (
    <PageShell
      testId="play-trade-page"
      eyebrow="Play & Trade"
      title={
        <>
          <span className="text-gradient-aurora">Play & Trade</span>
        </>
      }
      description="Two worlds. One ecosystem. Play for fun or play to win — then trade what you've earned."
    >
      {/* Coming Soon Banner */}
      <div
        className="relative overflow-hidden rounded-3xl p-8 sm:p-10 mb-16"
        style={{
          background:
            "linear-gradient(135deg, rgba(138,92,255,0.15), rgba(255,107,186,0.10) 50%, rgba(0,204,255,0.12))",
          border: "1px solid rgba(184,172,255,0.28)",
        }}
      >
        <div className="relative z-10 text-center">
          <div className="chip mx-auto mb-5 w-fit">
            <span className="chip-dot" />
            <span>Coming Soon</span>
          </div>
          <h2 className="font-display uppercase text-3xl sm:text-4xl text-white mb-4">
            The arena is{" "}
            <span className="text-gradient-gold">almost ready.</span>
          </h2>
          <p className="text-white/70 max-w-2xl mx-auto leading-relaxed">
            We're building something special — a place where your cards come
            alive through gameplay and your collection becomes a living,
            evolving asset. Stay tuned.
          </p>
        </div>
      </div>

      {/* PLAY Section */}
      <section className="mb-20" data-testid="play-section">
        <div className="flex items-center gap-4 mb-10">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, var(--electric-blue), var(--cosmic-violet))",
              boxShadow: "0 8px 24px rgba(0,204,255,0.3)",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <div>
            <p
              className="text-[0.72rem] uppercase tracking-[0.22em]"
              style={{ color: "var(--electric-blue)" }}
            >
              Section 01
            </p>
            <h3 className="font-display uppercase text-2xl sm:text-3xl text-white">
              Play
            </h3>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Free to Play */}
          <div
            className="glass p-8 relative overflow-hidden"
            style={{ borderColor: "rgba(0,204,255,0.2)" }}
          >
            <div
              className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-15"
              style={{ background: "var(--electric-blue)" }}
            />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="text-[0.65rem] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: "rgba(0,204,255,0.15)",
                    color: "var(--electric-blue)",
                    border: "1px solid rgba(0,204,255,0.3)",
                  }}
                >
                  Free to Play
                </span>
              </div>
              <h4 className="font-display uppercase text-xl text-white mb-3">
                Jump in. No strings attached.
              </h4>
              <p className="text-white/70 leading-relaxed mb-5">
                Every player gets access to <strong className="text-white">Play Cards</strong> — 
                a dedicated set of cards designed purely for in-game battles. No purchase 
                required. No wallet needed. Just pick up and play with anyone, 
                anywhere in the world.
              </p>
              <ul className="space-y-3">
                <FeatureItem text="Instant access — start playing the moment you sign up" />
                <FeatureItem text="Play Cards are free and unlimited — no pay-to-win" />
                <FeatureItem text="Battle friends or match with players globally" />
                <FeatureItem text="Casual fun or ranked competitive — your choice" />
              </ul>
            </div>
          </div>

          {/* Competitive / Collect Cards */}
          <div
            className="glass p-8 relative overflow-hidden"
            style={{ borderColor: "rgba(255,196,102,0.2)" }}
          >
            <div
              className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-15"
              style={{ background: "var(--aurora-gold)" }}
            />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="text-[0.65rem] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: "rgba(255,196,102,0.15)",
                    color: "var(--aurora-gold)",
                    border: "1px solid rgba(255,196,102,0.3)",
                  }}
                >
                  Competitive Edge
                </span>
              </div>
              <h4 className="font-display uppercase text-xl text-white mb-3">
                Own it. Evolve it. Dominate.
              </h4>
              <p className="text-white/70 leading-relaxed mb-5">
                Got a <strong className="text-white">Collect Card</strong> from 
                a Card Pack? That's where things get serious. Whether it's a 
                Digital card in your collection or a Real physical card you've 
                redeemed — you can <strong className="text-white">level up</strong> and{" "}
                <strong className="text-white">evolve</strong> it to unlock 
                devastating new abilities and bring it into competitive play.
              </p>
              <ul className="space-y-3">
                <FeatureItem text="Collect Cards from Card Packs — Digital or Real" />
                <FeatureItem text="Level up your cards through gameplay and achievements" />
                <FeatureItem text="Evolve cards to unlock exclusive abilities and art" />
                <FeatureItem text="Your evolved cards become your competitive arsenal" />
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* TRADE Section */}
      <section data-testid="trade-section">
        <div className="flex items-center gap-4 mb-10">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, var(--aurora-gold), var(--aurora-pink))",
              boxShadow: "0 8px 24px rgba(255,196,102,0.3)",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 16V4M7 4L3 8M7 4L11 8" />
              <path d="M17 8V20M17 20L21 16M17 20L13 16" />
            </svg>
          </div>
          <div>
            <p
              className="text-[0.72rem] uppercase tracking-[0.22em]"
              style={{ color: "var(--aurora-gold)" }}
            >
              Section 02
            </p>
            <h3 className="font-display uppercase text-2xl sm:text-3xl text-white">
              Trade
            </h3>
          </div>
        </div>

        <div
          className="glass p-8 sm:p-10 relative overflow-hidden"
          style={{ borderColor: "rgba(255,196,102,0.2)" }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 20% 30%, rgba(255,196,102,0.12), transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(255,107,186,0.08), transparent 60%)",
            }}
          />
          <div className="relative z-10">
            <h4 className="font-display uppercase text-xl text-white mb-3">
              Your cards. Your marketplace.
            </h4>
            <p className="text-white/70 leading-relaxed mb-8 max-w-2xl">
              Every Digital card you own is a tradeable asset. List it at a 
              fixed price, or put it up for auction and let the community 
              decide its value. Every transaction is verified on-chain — 
              no fakes, no scams, no middlemen.
            </p>

            <div className="grid gap-5 sm:grid-cols-3">
              <TradeFeature
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                }
                title="Buy & Sell"
                desc="Set your price, list your card. Buyers pay with credits — sellers get paid instantly."
              />
              <TradeFeature
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                }
                title="Auction"
                desc="Got a rare Legendary? Let collectors bid. The highest offer wins — simple as that."
              />
              <TradeFeature
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                }
                title="Verified"
                desc="Every listing carries an on-chain rarity signature. What you see is what you get."
              />
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="mt-1 w-5 h-5 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: "rgba(0,255,136,0.15)",
          border: "1px solid rgba(0,255,136,0.3)",
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span className="text-sm text-white/70 leading-relaxed">{text}</span>
    </li>
  );
}

function TradeFeature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div
      className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08]"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{
          background: "rgba(255,196,102,0.1)",
          color: "var(--aurora-gold)",
        }}
      >
        {icon}
      </div>
      <h5 className="text-sm font-medium text-white mb-1.5">{title}</h5>
      <p className="text-xs text-white/60 leading-relaxed">{desc}</p>
    </div>
  );
}
