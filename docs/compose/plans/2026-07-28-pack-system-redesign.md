# Pack System Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign pack system dengan 2 pack types (Standard 5 kartu/$5, Booster 10 kartu/$8), opening animation flip reveal satu per satu.

**Architecture:** Modifikasi API `/api/mint` untuk menerima `packType`, parameterize `buildPackRarities()`, rewrite `/packs` page dengan opening animation flow.

**Tech Stack:** Next.js 15, React, TypeScript, Tailwind CSS, ethers.js, MongoDB

## Global Constraints

- Sistem pembayaran: Credit (500 Credit = $5), bukan Stripe langsung
- Smart contract tidak diubah — `mintBatch()` tetap dipakai
- Odds table tetap: Common 70%, Rare 20%, Epic 8%, Legendary 2%
- Standard: 5 kartu, 1 guaranteed Rare+; Booster: 10 kartu, 2 guaranteed Rare+
- Animation: CSS flip reveal satu per satu, 0.5s interval, dari rarity terendah ke tertinggi
- `contractAddress` harus tercatat di semua records baru

---

### Task 1: Parameterize `buildPackRarities()` di `lib/odds.ts`

**Covers:** [S1]

**Files:**
- Modify: `frontend/lib/odds.ts`
- Test: manual via API

**Interfaces:**
- Produces: `buildPackRarities(packSize: number, guaranteedCount: number): Promise<number[]>`

- [ ] **Step 1: Ubah signature `buildPackRarities`**

```typescript
// lib/odds.ts — ganti fungsi buildPackRarities
export async function buildPackRarities(
  packSize: number = 8,
  guaranteedCount: number = 1
): Promise<number[]> {
  const rarities: number[] = [];

  // kartu random biasa (packSize - guaranteedCount)
  const randomCount = packSize - guaranteedCount;
  for (let i = 0; i < randomCount; i++) {
    rarities.push(await pickRarity());
  }

  // kartu dijamin Rare+
  for (let i = 0; i < guaranteedCount; i++) {
    rarities.push(await pickGuaranteedRareOrBetter());
  }

  // Shuffle (Fisher-Yates)
  for (let i = rarities.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rarities[i], rarities[j]] = [rarities[j], rarities[i]];
  }

  return rarities;
}
```

- [ ] **Step 2: Hapus `PACK_SIZE` constant**

Hapus baris `const PACK_SIZE = 8;` di atas `lib/odds.ts` karena sekarang parameterized.

- [ ] **Step 3: Verifikasi TypeScript**

Run: `npx tsc --noEmit` dari `frontend/`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/odds.ts
git commit -m "refactor: parameterize buildPackRarities(packSize, guaranteedCount)"
```

---

### Task 2: Modifikasi `/api/mint` untuk menerima `packType`

**Covers:** [S1, S4]

**Files:**
- Modify: `frontend/app/api/mint/route.ts`

**Interfaces:**
- Consumes: `buildPackRarities(packSize, guaranteedCount)` dari Task 1
- Produces: API endpoint menerima `{ userId, packType: "standard" | "booster" }`

- [ ] **Step 1: Tambah pack type mapping di atas route**

```typescript
// app/api/mint/route.ts — tambah di atas, setelah import
const PACK_TYPES: Record<string, { price: number; cards: number; guaranteed: number }> = {
  standard: { price: 500, cards: 5, guaranteed: 1 },
  booster: { price: 800, cards: 10, guaranteed: 2 },
};
```

- [ ] **Step 2: Modifikasi POST handler untuk accept packType**

```typescript
// Ganti baris: const { userId } = await request.json();
const { userId, packType = "standard" } = await request.json();

// Validasi packType
const pack = PACK_TYPES[packType];
if (!pack) {
  return NextResponse.json(
    { error: "Invalid pack type. Use 'standard' or 'booster'." },
    { status: 400 }
  );
}
```

- [ ] **Step 3: Ganti PACK_PRICE_CENTS dengan pack.price**

```typescript
// Hapus: const PACK_PRICE_CENTS = 500;
// Ganti semua PACK_PRICE_CENTS dengan pack.price

// Di deductCredits:
newBalance = await deductCredits(userId, pack.price);

// Di refund:
await addCredits(userId, pack.price);
```

- [ ] **Step 4: Ganti buildPackRarities() dengan parameter**

```typescript
// Ganti: const rarities = await buildPackRarities();
const rarities = await buildPackRarities(pack.cards, pack.guaranteed);
```

- [ ] **Step 5: Update purchasePrice di transaction record**

```typescript
// Ganti: purchasePrice: PACK_PRICE_CENTS,
purchasePrice: pack.price,
```

- [ ] **Step 6: Verifikasi TypeScript**

Run: `npx tsc --noEmit` dari `frontend/`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add frontend/app/api/mint/route.ts
git commit -m "feat: accept packType parameter in /api/mint (standard/booster)"
```

---

### Task 3: Rewrite `components/PackCard.tsx` untuk 2 variants

**Covers:** [S2]

**Files:**
- Modify: `frontend/components/PackCard.tsx`

**Interfaces:**
- Produces: `PackCard` component dengan props `{ type, price, cardCount, guaranteedRare, onBuy, loading }`

- [ ] **Step 1: Rewrite PackCard component**

```tsx
// components/PackCard.tsx
"use client";

interface PackCardProps {
  type: "standard" | "booster";
  price: number;
  cardCount: number;
  guaranteedRare: number;
  onBuy: () => Promise<void>;
  loading?: boolean;
}

const PACK_STYLES = {
  standard: {
    gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    accent: "var(--electric-blue)",
    icon: "🎴",
  },
  booster: {
    gradient: "linear-gradient(135deg, #2d1b69 0%, #11001c 50%, #4a0e4e 100%)",
    accent: "var(--aurora-gold)",
    icon: "🚀",
  },
} as const;

export default function PackCard({
  type,
  price,
  cardCount,
  guaranteedRare,
  onBuy,
  loading = false,
}: PackCardProps) {
  const style = PACK_STYLES[type];

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-8 text-center transition-all hover:scale-[1.02] hover:shadow-2xl"
      style={{
        background: style.gradient,
        border: `1px solid ${style.accent}33`,
        boxShadow: `0 8px 32px ${style.accent}22`,
      }}
    >
      {/* Decorative glow */}
      <div
        className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-20"
        style={{ background: style.accent }}
      />

      <div className="relative z-10">
        <div className="text-6xl mb-4">{style.icon}</div>
        <h3
          className="font-display text-2xl font-bold mb-2 uppercase"
          style={{ color: style.accent }}
        >
          {type === "standard" ? "Standard Pack" : "Booster Pack"}
        </h3>
        <p className="text-sm text-white/60 mb-1">
          {cardCount} kartu random
        </p>
        <p className="text-xs text-white/40 mb-6">
          Dijamin {guaranteedRare} Rare+
        </p>
        <p
          className="text-4xl font-bold mb-6"
          style={{ color: "var(--aurora-gold)" }}
        >
          {price} Credit
        </p>
        <button
          onClick={onBuy}
          disabled={loading}
          className="w-full py-3 px-6 rounded-2xl text-sm font-medium transition-all disabled:opacity-50"
          style={{
            background: `linear-gradient(135deg, ${style.accent}, ${style.accent}88)`,
            color: "#fff",
          }}
        >
          {loading ? "Opening..." : "Buy & Open"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verifikasi TypeScript**

Run: `npx tsc --noEmit` dari `frontend/`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/components/PackCard.tsx
git commit -m "feat: redesign PackCard with Standard/Booster variants"
```

---

### Task 4: Rewrite `components/PackReveal.tsx` dengan flip animation

**Covers:** [S3]

**Files:**
- Modify: `frontend/components/PackReveal.tsx`

**Interfaces:**
- Consumes: `RevealResult` type (sudah ada)
- Produces: `PackReveal` component dengan flip animation sequential reveal

- [ ] **Step 1: Rewrite PackReveal dengan flip animation**

```tsx
// components/PackReveal.tsx
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
    <section className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 py-14">
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
                  className="relative perspective-1000"
                  style={{ perspective: "1000px" }}
                >
                  <div
                    className={`relative w-full transition-transform duration-500 ease-out ${
                      isRevealed ? "" : "animate-pulse"
                    }`}
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
```

- [ ] **Step 2: Verifikasi TypeScript**

Run: `npx tsc --noEmit` dari `frontend/`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/components/PackReveal.tsx
git commit -m "feat: flip animation reveal for pack opening"
```

---

### Task 5: Rewrite `/packs` page dengan 2 pack cards + opening flow

**Covers:** [S2, S3]

**Files:**
- Modify: `frontend/app/packs/page.tsx`

**Interfaces:**
- Consumes: `PackCard` dari Task 3, `PackReveal` dari Task 4, `/api/mint` dari Task 2

- [ ] **Step 1: Rewrite packs page**

```tsx
// app/packs/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/PageShell";
import PackCard from "@/components/PackCard";
import PackReveal, { type RevealResult } from "@/components/PackReveal";

interface SessionUser {
  user_id: string;
  username: string;
}

export default function PacksPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [reveal, setReveal] = useState<RevealResult | null>(null);
  const [loadingType, setLoadingType] = useState<"standard" | "booster" | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("user");
    if (!stored) {
      window.location.replace("/login");
      return;
    }
    try {
      setUser(JSON.parse(stored));
      setReady(true);
    } catch {
      window.location.replace("/login");
    }
  }, []);

  useEffect(() => {
    if (!ready || !user) return;
    fetch(`/api/credits?userId=${user.user_id}`)
      .then((r) => r.json())
      .then((d) => setBalance(d.balance ?? 0))
      .catch(() => setBalance(0));
  }, [ready, user]);

  const handleBuy = useCallback(
    async (packType: "standard" | "booster") => {
      if (!user) {
        router.push("/login");
        return;
      }
      setLoadingType(packType);
      setReveal(null);
      try {
        const res = await fetch("/api/mint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.user_id, packType }),
        });
        const data = await res.json();
        if (res.ok) {
          setReveal(data as RevealResult);
          // Refresh balance
          fetch(`/api/credits?userId=${user.user_id}`)
            .then((r) => r.json())
            .then((d) => setBalance(d.balance ?? 0))
            .catch(() => {});
        } else {
          setReveal({ error: data.error || "Failed to open pack" });
        }
      } catch {
        setReveal({ error: "Network error. Please try again." });
      } finally {
        setLoadingType(null);
      }
    },
    [user, router]
  );

  if (!ready || !user) return null;

  return (
    <PageShell
      testId="packs-page"
      eyebrow="Packs"
      title={
        <>
          <span className="text-gradient-aurora">Choose Your Pack</span>
        </>
      }
      description="Open packs to discover new cards and build your collection."
    >
      {/* Balance */}
      {balance !== null && (
        <div className="text-center mb-8">
          <span className="text-sm text-white/60">Your Balance: </span>
          <span className="text-lg font-display" style={{ color: "var(--aurora-gold)" }}>
            {balance.toLocaleString()} Credit
          </span>
        </div>
      )}

      {/* Pack Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        <PackCard
          type="standard"
          price={500}
          cardCount={5}
          guaranteedRare={1}
          onBuy={() => handleBuy("standard")}
          loading={loadingType === "standard"}
        />
        <PackCard
          type="booster"
          price={800}
          cardCount={10}
          guaranteedRare={2}
          onBuy={() => handleBuy("booster")}
          loading={loadingType === "booster"}
        />
      </div>

      {/* Reveal */}
      {reveal && <PackReveal result={reveal} />}
    </PageShell>
  );
}
```

- [ ] **Step 2: Verifikasi TypeScript**

Run: `npx tsc --noEmit` dari `frontend/`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/app/packs/page.tsx
git commit -m "feat: /packs page with Standard/Booster packs and opening animation"
```

---

### Task 6: Update home page — pindahkan buy flow ke /packs

**Covers:** [S2]

**Files:**
- Modify: `frontend/app/page.tsx`

**Interfaces:**
- Menghapus buy flow dari home page, user diarahkan ke /packs

- [ ] **Step 1: Simplify home page**

```tsx
// app/page.tsx — hapus PackReveal import dan handleBuyPack
// Ganti HomeHero onExplore dengan redirect ke /packs

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import HomeHero from "@/components/home/HomeHero";
import HomeFeaturedCards from "@/components/home/HomeFeaturedCards";
import HomeWhyGachard from "@/components/home/HomeWhyGachard";
import HomeHowItWorks from "@/components/home/HomeHowItWorks";
import HomeCtaBand from "@/components/home/HomeCtaBand";

interface SessionUser {
  user_id: string;
  username: string;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("user");
    if (!stored) return;
    try {
      setUser(JSON.parse(stored) as SessionUser);
    } catch {
      /* corrupt session — ignore */
    }
  }, []);

  const handleExplore = () => {
    if (user) {
      router.push("/packs");
    } else {
      router.push("/login");
    }
  };

  return (
    <div data-testid="home-page">
      <HomeHero
        onExplore={handleExplore}
        exploreLoading={false}
        isAuthenticated={!!user}
      />
      <HomeFeaturedCards />
      <HomeWhyGachard />
      <HomeHowItWorks />
      <HomeCtaBand onOpenPack={handleExplore} loading={false} />
    </div>
  );
}
```

- [ ] **Step 2: Verifikasi TypeScript**

Run: `npx tsc --noEmit` dari `frontend/`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/app/page.tsx
git commit -m "refactor: move buy flow from home to /packs page"
```

---

### Task 7: Final verification & deploy

**Covers:** [S1, S2, S3, S4, S5]

**Files:**
- All modified files

- [ ] **Step 1: TypeScript check**

Run: `npx tsc --noEmit` dari `frontend/`
Expected: no errors

- [ ] **Step 2: Build check**

Run: `npm run build` dari `frontend/`
Expected: successful build

- [ ] **Step 3: Test API manually**

```bash
# Test standard pack
curl -X POST http://localhost:3000/api/mint \
  -H "Content-Type: application/json" \
  -d '{"userId":"6a626eae2c4e9ce68fb3e0e0","packType":"standard"}'

# Test booster pack
curl -X POST http://localhost:3000/api/mint \
  -H "Content-Type: application/json" \
  -d '{"userId":"6a626eae2c4e9ce68fb3e0e0","packType":"booster"}'
```

- [ ] **Step 4: Commit all and push**

```bash
git add -A
git commit -m "feat: pack system redesign — Standard/Booster packs with flip reveal animation"
git push
```
