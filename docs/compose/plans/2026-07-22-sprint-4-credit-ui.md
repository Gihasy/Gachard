# Sprint 4 — Sistem Credit & UI Utama Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementasi sistem credit dual-track + UI utama yang bisa dipakai end-to-end: top up credit, beli pack, reveal kartu, lihat koleksi, request print.

**Architecture:** Credit system berbasis MongoDB (integer/sen, bukan on-chain). Stripe test-mode untuk top-up credit dan direct payment print. UI menggunakan Next.js App Router + Tailwind CSS, client components untuk interaksi.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, MongoDB, Stripe (test-mode), ethers.js

## Global Constraints

- Dual payment: credit untuk pack, direct payment untuk print (ADR-008)
- Credit disimpan sebagai integer/sen di database, bukan on-chain (PRD §8)
- Odds/rarity di backend, bukan on-chain (ADR-009)
- Marketplace hanya placeholder "Coming Soon" (ADR-010)
- PWA delivery (ADR-013)
- Semua transaksi via Next.js API routes (ADR-017)
- Pola async untuk blockchain tx (ADR-018)

---

## Task 0: Update `confirmTransaction()` — Extract tokenId dari Event Log

**Covers:** ADR-018 (async pattern), integrasi `cards` collection dengan tokenId on-chain

**Files:**
- Modify: `frontend/lib/transactions.ts`
- Modify: `frontend/lib/blockchain.ts` (tambah event ABI parsing)

**Interfaces:**
- Consumes: `getProvider()` dari `lib/blockchain.ts`
- Consumes: `getCollection("cards")` dari `lib/mongodb.ts`
- Produces: Saat transaksi `mint` dikonfirmasi, `cards.tokenId` diupdate dengan tokenId sungguhan dari event log

- [ ] **Step 1: Update `confirmTransaction()` di `lib/transactions.ts`**

Tambahkan logika setelah status berubah jadi `confirmed` untuk type `mint`:

```typescript
// Tambah di bagian atas file
import { ethers } from "ethers";

// ABI fragment untuk decode event CardMinted
const CARD_MINTED_TOPIC = ethers.id("CardMinted(uint256,address,uint8,uint8)");

// Di dalam confirmTransaction(), setelah const newStatus: TxStatus = receipt.status === 1 ? "confirmed" : "failed";

// Jika confirmed dan type mint, extract tokenId dari event log
if (newStatus === "confirmed" && tx.type === "mint" && receipt.logs) {
  for (const log of receipt.logs) {
    if (log.topics[0] === CARD_MINTED_TOPIC && log.address.toLowerCase() === process.env.CONTRACT_ADDRESS?.toLowerCase()) {
      // topics[1] = tokenId (indexed)
      const tokenId = parseInt(log.topics[1], 16);

      // Update cards collection — match by txId
      const cardsCollection = await collection.db.collection("cards");
      await cardsCollection.updateOne(
        { txId: tx._id.toString() },
        { $set: { tokenId, status: "Digital", updatedAt: new Date().toISOString() } }
      );
      break;
    }
  }
}

// Kemudian update transaksi status seperti biasa
await collection.updateOne(
  { _id: tx._id },
  {
    $set: {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    },
  }
);
```

- [ ] **Step 2: Build verifikasi**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/transactions.ts
git commit -m "feat: extract tokenId from CardMinted event on mint confirmation"
```

---

## Task 1: Credit System — Model & API Routes

**Covers:** ADR-008, PRD §8 (credit system)

**Files:**
- Create: `frontend/lib/credits.ts`
- Create: `frontend/app/api/credits/route.ts`
- Create: `frontend/app/api/credits/topup/route.ts`

**Interfaces:**
- Produces: `getBalance(userId)`, `addCredits(userId, amountCents)`, `deductCredits(userId, amountCents)`
- Produces: `GET /api/credits?userId=...` → `{balance: number}`
- Produces: `POST /api/credits/topup` → `{success, newBalance}`

- [ ] **Step 1: Buat `lib/credits.ts`**

```typescript
// frontend/lib/credits.ts
import { getCollection } from "./mongodb";
import { ObjectId } from "mongodb";

/**
 * Get user's credit balance (in cents/sen).
 * Returns 0 if user has no credit record yet.
 */
export async function getCreditBalance(userId: string): Promise<number> {
  const collection = await getCollection("credits");
  const record = await collection.findOne({ userId });
  return record?.balance ?? 0;
}

/**
 * Add credits to user's balance (top-up).
 * Amount in cents (e.g., 500 = $5.00).
 * Returns new balance.
 */
export async function addCredits(userId: string, amountCents: number): Promise<number> {
  if (amountCents <= 0) throw new Error("Amount must be positive");
  if (amountCents > 10000) throw new Error("Max top-up is $100.00");

  const collection = await getCollection("credits");
  const result = await collection.findOneAndUpdate(
    { userId },
    {
      $inc: { balance: amountCents },
      $setOnInsert: { userId, createdAt: new Date().toISOString() },
      $set: { updatedAt: new Date().toISOString() },
    },
    { upsert: true, returnDocument: "after" }
  );

  return result?.balance ?? amountCents;
}

/**
 * Deduct credits from user's balance (buy pack).
 * Returns new balance. Throws if insufficient.
 */
export async function deductCredits(userId: string, amountCents: number): Promise<number> {
  if (amountCents <= 0) throw new Error("Amount must be positive");

  const collection = await getCollection("credits");
  const record = await collection.findOne({ userId });

  if (!record || record.balance < amountCents) {
    throw new Error("Insufficient credit balance");
  }

  const result = await collection.findOneAndUpdate(
    { userId, balance: { $gte: amountCents } },
    {
      $inc: { balance: -amountCents },
      $set: { updatedAt: new Date().toISOString() },
    },
    { returnDocument: "after" }
  );

  if (!result) throw new Error("Insufficient credit balance");
  return result.balance;
}
```

- [ ] **Step 2: Buat `GET /api/credits`**

```typescript
// frontend/app/api/credits/route.ts
import { NextResponse } from "next/server";
import { getCreditBalance } from "@/lib/credits";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const balance = await getCreditBalance(userId);
    return NextResponse.json({ balance });
  } catch (error) {
    console.error("Get credits error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Buat `POST /api/credits/topup`**

```typescript
// frontend/app/api/credits/topup/route.ts
import { NextResponse } from "next/server";
import { addCredits } from "@/lib/credits";

export async function POST(request: Request) {
  try {
    const { userId, amountCents } = await request.json();

    if (!userId || !amountCents) {
      return NextResponse.json({ error: "userId and amountCents required" }, { status: 400 });
    }

    const newBalance = await addCredits(userId, amountCents);
    return NextResponse.json({ success: true, newBalance });
  } catch (error) {
    console.error("Top-up error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
```

- [ ] **Step 4: Build verifikasi**

```bash
cd frontend && npm run build
```

Expected: `/api/credits` dan `/api/credits/topup` muncul di route list

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/credits.ts frontend/app/api/credits/
git commit -m "feat: add credit system with top-up API"
```

---

## Task 2: Buy Pack — Deduct Credit + Mint

**Covers:** ADR-008 (credit untuk beli pack), integrasi dengan mint

**Files:**
- Modify: `frontend/app/api/mint/route.ts`

**Interfaces:**
- Consumes: `deductCredits(userId, amountCents)` dari Task 1
- Consumes: `mintCard(toAddress, rarity)` dari `lib/blockchain.ts`
- Consumes: `pickRarity()` dari `lib/odds.ts`
- Consumes: `pickCardTemplate(rarity)` dari `lib/card-templates.ts`

- [ ] **Step 1: Update `/api/mint` untuk deduct credit + refund on failure**

```typescript
// frontend/app/api/mint/route.ts
import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { mintCard } from "@/lib/blockchain";
import { pickRarity } from "@/lib/odds";
import { pickCardTemplate, seedCardTemplates } from "@/lib/card-templates";
import { deductCredits, addCredits } from "@/lib/credits";

const PACK_PRICE_CENTS = 299; // $2.99 per pack

export async function POST(request: Request) {
  const { userId } = await request.json();

  // Get user from DB
  const usersCollection = await getCollection("users");
  const user = await usersCollection.findOne({ _id: userId });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Deduct credit FIRST (before minting)
  let newBalance: number;
  try {
    newBalance = await deductCredits(userId, PACK_PRICE_CENTS);
  } catch {
    return NextResponse.json(
      { error: "Insufficient credit balance", price: PACK_PRICE_CENTS },
      { status: 402 }
    );
  }

  // Bungkus sisa proses dalam try/catch — refund jika gagal
  try {
    // Seed card templates if needed
    await seedCardTemplates();

    // Weighted random pick rarity
    const rarity = await pickRarity();

    // Pick card template
    const template = await pickCardTemplate(rarity);

    // Submit mint transaction (async — ADR-018)
    const txHash = await mintCard(user.walletAddress, rarity);

    // Simpan transaksi sebagai pending
    const txCollection = await getCollection("transactions");
    const result = await txCollection.insertOne({
      userId: user._id.toString(),
      type: "mint",
      rarity,
      templateId: template.templateId,
      txHash,
      status: "pending",
      fromAddress: process.env.ADMIN_WALLET_ADDRESS,
      toAddress: user.walletAddress,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Simpan card record
    const cardsCollection = await getCollection("cards");
    await cardsCollection.insertOne({
      tokenId: null,
      txId: result.insertedId.toString(),
      templateId: template.templateId,
      rarity,
      ownerAddress: user.walletAddress,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      status: "pending",
      txId: result.insertedId.toString(),
      txHash,
      rarity,
      template: { templateId: template.templateId, name: template.name },
      newBalance,
    });
  } catch (error) {
    // REFUND: kembalikan saldo jika mint gagal setelah deduct
    console.error("Mint failed after deduct, refunding:", error);
    try {
      await addCredits(userId, PACK_PRICE_CENTS);
    } catch (refundError) {
      console.error("CRITICAL: Refund failed:", refundError);
    }
    return NextResponse.json({ error: "Mint failed, credit refunded" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Build verifikasi**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/mint/route.ts
git commit -m "feat: integrate credit deduction into mint flow"
```

---

## Task 3: Request Print — Stripe Direct Payment

**Covers:** ADR-008 (direct payment untuk print), Sprint 3 `/api/print` sudah ada

**Files:**
- Create: `frontend/app/api/print/checkout/route.ts`
- Modify: `frontend/app/api/print/route.ts` (tambah Stripe checkout)

**Note:** Untuk hackathon demo, kita simulasi Stripe checkout dengan endpoint yang langsung memproses payment (tanpa redirect ke Stripe). Ini cukup untuk demo — user tidak perlu kartu kredit sungguhan.

- [ ] **Step 1: Buat `POST /api/print/checkout`**

```typescript
// frontend/app/api/print/checkout/route.ts
import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

const PRINT_PRICE_CENTS = 999; // $9.99 per print

export async function POST(request: Request) {
  try {
    const { userId, tokenId } = await request.json();

    if (!userId || tokenId === undefined) {
      return NextResponse.json({ error: "userId and tokenId required" }, { status: 400 });
    }

    // Verify user exists
    const usersCollection = await getCollection("users");
    const user = await usersCollection.findOne({ _id: userId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Simulate Stripe checkout success (for hackathon demo)
    // In production: create Stripe Checkout Session, redirect user, handle webhook
    const paymentRecord = {
      userId: user._id.toString(),
      tokenId,
      amountCents: PRINT_PRICE_CENTS,
      currency: "usd",
      status: "succeeded", // Simulated
      stripePaymentId: `sim_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const paymentsCollection = await getCollection("payments");
    const result = await paymentsCollection.insertOne(paymentRecord);

    return NextResponse.json({
      success: true,
      paymentId: result.insertedId.toString(),
      amount: PRINT_PRICE_CENTS,
    });
  } catch (error) {
    console.error("Print checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update `/api/print` untuk verify payment**

```typescript
// frontend/app/api/print/route.ts — tambah verifikasi payment sebelum mint
// (modifikasi yang sudah ada dari Sprint 3)

// Tambah di awal POST handler, setelah get user:
const { userId, tokenId, paymentId } = await request.json();

// Verify payment exists
if (paymentId) {
  const paymentsCollection = await getCollection("payments");
  const payment = await paymentsCollection.findOne({ _id: paymentId });
  if (!payment || payment.status !== "succeeded") {
    return NextResponse.json({ error: "Payment not verified" }, { status: 402 });
  }
}
```

- [ ] **Step 3: Build verifikasi**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/api/print/
git commit -m "feat: add print checkout endpoint (Stripe simulated)"
```

---

## Task 4: UI — Home Page dengan Pack Display

**Covers:** PRD §4 (user flow), Sprint 4 Definition of Done

**Files:**
- Modify: `frontend/app/page.tsx`
- Create: `frontend/components/PackCard.tsx`

- [ ] **Step 1: Buat `PackCard.tsx` component**

```tsx
// frontend/components/PackCard.tsx
"use client";

interface PackCardProps {
  price: number; // in cents
  onBuy: () => Promise<void>;
  loading?: boolean;
}

export default function PackCard({ price, onBuy, loading = false }: PackCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 text-center">
      <div className="text-4xl mb-4">🎴</div>
      <h3 className="text-lg font-semibold mb-2">Card Pack</h3>
      <p className="text-gray-500 text-sm mb-4">1 kartu random per pembelian</p>
      <p className="text-2xl font-bold text-indigo-600 mb-4">
        ${(price / 100).toFixed(2)}
      </p>
      <button
        onClick={onBuy}
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "Processing..." : "Buy Pack"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Update Home page dengan reveal inline**

```tsx
// frontend/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PackCard from "@/components/PackCard";

const RARITY_COLORS = ["border-gray-300", "border-blue-400", "border-purple-400", "border-yellow-400"];
const RARITY_BG = ["bg-gray-50", "bg-blue-50", "bg-purple-50", "bg-yellow-50"];
const RARITY_LABELS = ["Common", "Rare", "Epic", "Legendary"];

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
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
        .then((d) => setBalance(d.balance));
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
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Selamat Datang di Gachard</h1>
      <p className="text-gray-600 mb-8">Platform kartu TCG digital-native dengan mekanisme lock-vault-redeem.</p>

      {user && balance !== null && (
        <div className="bg-indigo-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-indigo-700">Saldo Credit: <span className="font-bold">${(balance / 100).toFixed(2)}</span></p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PackCard price={299} onBuy={handleBuyPack} loading={loading} />
      </div>

      {/* Reveal display — inline, bukan alert */}
      {reveal && !reveal.error && (
        <div className="mt-8 text-center">
          <h2 className="text-xl font-bold mb-4">Pack Dibuka!</h2>
          <div className={`inline-block rounded-xl overflow-hidden shadow-lg border-2 ${RARITY_COLORS[reveal.rarity]} ${RARITY_BG[reveal.rarity]}`}>
            {reveal.template?.artworkUrl ? (
              <img src={reveal.template.artworkUrl} alt={reveal.template.name} className="w-48 h-64 object-cover" />
            ) : (
              <div className="w-48 h-64 bg-gray-200 flex items-center justify-center">
                <span className="text-6xl">🎴</span>
              </div>
            )}
            <div className="p-4">
              <p className="font-semibold">{reveal.template?.name}</p>
              <p className={`text-sm font-bold ${reveal.rarity >= 2 ? "text-purple-600" : "text-gray-600"}`}>
                {RARITY_LABELS[reveal.rarity]}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            <a href="/koleksi" className="text-indigo-600 underline">Lihat di Koleksi →</a>
          </p>
        </div>
      )}

      {reveal?.error && (
        <div className="mt-8 bg-red-50 text-red-700 p-4 rounded-lg text-center">
          {reveal.error}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Build verifikasi**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/page.tsx frontend/components/PackCard.tsx
git commit -m "feat: home page with pack display and buy flow"
```

---

## Task 5: UI — Top Up Credit Page

**Covers:** ADR-008 (top-up credit via Stripe test-mode)

**Files:**
- Create: `frontend/app/topup/page.tsx`
- Modify: `frontend/components/Navbar.tsx` (tambah link Top Up)

- [ ] **Step 1: Buat top-up page**

```tsx
// frontend/app/topup/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const PRESETS = [500, 1000, 2000, 5000]; // $5, $10, $20, $50

export default function TopUp() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [amount, setAmount] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/login");
      return;
    }
    const u = JSON.parse(stored);
    setUser(u);
    fetch(`/api/credits?userId=${u.user_id}`)
      .then((r) => r.json())
      .then((d) => setBalance(d.balance));
  }, [router]);

  const handleTopUp = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const res = await fetch("/api/credits/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.user_id, amountCents: amount }),
      });

      const data = await res.json();
      if (res.ok) {
        setBalance(data.newBalance);
        alert(`Top-up berhasil! Saldo: $${(data.newBalance / 100).toFixed(2)}`);
      } else {
        alert(data.error || "Top-up gagal");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-8">Top Up Credit</h1>

      {balance !== null && (
        <div className="bg-indigo-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-indigo-700">Saldo saat ini: <span className="font-bold">${(balance / 100).toFixed(2)}</span></p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setAmount(p)}
            className={`py-3 rounded-lg font-medium ${
              amount === p ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            ${(p / 100).toFixed(2)}
          </button>
        ))}
      </div>

      <button
        onClick={handleTopUp}
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "Processing..." : `Top Up $${(amount / 100).toFixed(2)}`}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Update Navbar — tambah link Top Up**

```tsx
// frontend/components/Navbar.tsx — tambah di navItems
const navItems = [
  { href: "/", label: "Home" },
  { href: "/topup", label: "Top Up" },
  { href: "/koleksi", label: "Koleksi" },
  { href: "/profil", label: "Profil" },
];
```

- [ ] **Step 3: Build verifikasi**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/topup/ frontend/components/Navbar.tsx
git commit -m "feat: top-up credit page with preset amounts"
```

---

## Task 6: UI — Koleksi Page (Display User's Cards)

**Covers:** PRD §4 (user flow: lihat koleksi)

**Files:**
- Modify: `frontend/app/koleksi/page.tsx`
- Create: `frontend/components/CardItem.tsx`
- Create: `frontend/app/api/cards/route.ts`

- [ ] **Step 1: Buat `GET /api/cards` endpoint dengan artworkUrl lookup**

```typescript
// frontend/app/api/cards/route.ts
import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Get user's wallet address
    const usersCollection = await getCollection("users");
    const user = await usersCollection.findOne({ _id: userId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's cards
    const cardsCollection = await getCollection("cards");
    const cards = await cardsCollection
      .find({ ownerAddress: user.walletAddress })
      .toArray();

    // Lookup artworkUrl dari card_templates
    const templatesCollection = await getCollection("card_templates");
    const templates = await templatesCollection.find({}).toArray();
    const templateMap = new Map(templates.map((t) => [t.templateId, t]));

    // Gabungkan card data dengan template info
    const enrichedCards = cards.map((card) => {
      const template = templateMap.get(card.templateId);
      return {
        tokenId: card.tokenId,
        templateId: card.templateId,
        rarity: card.rarity,
        status: card.status || "Digital",
        artworkUrl: template?.artworkUrl || "",
        templateName: template?.name || card.templateId,
      };
    });

    return NextResponse.json({ cards: enrichedCards });
  } catch (error) {
    console.error("Get cards error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Buat `CardItem.tsx` component dengan tombol Request Print**

```tsx
// frontend/components/CardItem.tsx
"use client";

import { useState } from "react";

interface CardItemProps {
  tokenId: number | null;
  templateId: string;
  rarity: number;
  artworkUrl: string;
  status: string;
  userId: string;
}

const RARITY_COLORS = ["bg-gray-100", "bg-blue-100", "bg-purple-100", "bg-yellow-100"];
const RARITY_LABELS = ["Common", "Rare", "Epic", "Legendary"];

export default function CardItem({ tokenId, templateId, rarity, artworkUrl, status, userId }: CardItemProps) {
  const [printing, setPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  // Tombol Request Print: hanya untuk kartu Digital dengan tokenId terisi
  const canPrint = status === "Digital" && tokenId !== null;

  const handleRequestPrint = async () => {
    if (!tokenId) return;
    setPrinting(true);
    setPrintStatus(null);

    try {
      // Step 1: Checkout (simulated Stripe)
      const checkoutRes = await fetch("/api/print/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tokenId }),
      });
      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) {
        setPrintStatus(checkoutData.error || "Checkout failed");
        return;
      }

      // Step 2: Request print on-chain
      const printRes = await fetch("/api/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tokenId, paymentId: checkoutData.paymentId }),
      });
      const printData = await printRes.json();
      if (printRes.ok) {
        setPrintStatus("Print requested! Status will update after confirmation.");
      } else {
        setPrintStatus(printData.error || "Print failed");
      }
    } catch {
      setPrintStatus("Network error");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className={`rounded-xl overflow-hidden shadow-md ${RARITY_COLORS[rarity]}`}>
      {artworkUrl ? (
        <img src={artworkUrl} alt={templateId} className="w-full h-48 object-cover" />
      ) : (
        <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
          <span className="text-4xl">🎴</span>
        </div>
      )}
      <div className="p-3">
        <p className="text-sm font-medium">{templateId}</p>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs font-semibold text-indigo-600">{RARITY_LABELS[rarity]}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${status === "Vaulted" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
            {status}
          </span>
        </div>
        {canPrint && (
          <button
            onClick={handleRequestPrint}
            disabled={printing}
            className="mt-2 w-full bg-gray-800 text-white text-xs py-1.5 rounded hover:bg-gray-900 disabled:opacity-50"
          >
            {printing ? "Processing..." : "Request Print"}
          </button>
        )}
        {printStatus && (
          <p className="mt-1 text-xs text-gray-600">{printStatus}</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update Koleksi page**

```tsx
// frontend/app/koleksi/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CardItem from "@/components/CardItem";

export default function Koleksi() {
  const router = useRouter();
  const [cards, setCards] = useState<any[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/login");
      return;
    }
    const user = JSON.parse(stored);
    setUserId(user.user_id);
    fetch(`/api/cards?userId=${user.user_id}`)
      .then((r) => r.json())
      .then((d) => {
        setCards(d.cards || []);
        setLoading(false);
      });
  }, [router]);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Koleksi Saya</h1>
      {cards.length === 0 ? (
        <p className="text-gray-500">Belum ada kartu. Beli pack di Home!</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map((card) => (
            <CardItem
              key={card.templateId + (card.tokenId || "")}
              tokenId={card.tokenId}
              templateId={card.templateId}
              rarity={card.rarity}
              artworkUrl={card.artworkUrl || ""}
              status={card.status || "Digital"}
              userId={userId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Build verifikasi**

```bash
cd frontend && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add frontend/app/koleksi/ frontend/components/CardItem.tsx frontend/app/api/cards/
git commit -m "feat: koleksi page with card grid display"
```

---

## Task 7: UI — Marketplace Placeholder "Coming Soon"

**Covers:** ADR-010

**Files:**
- Create: `frontend/app/marketplace/page.tsx`
- Modify: `frontend/components/Navbar.tsx` (tambah link)

- [ ] **Step 1: Buat marketplace placeholder**

```tsx
// frontend/app/marketplace/page.tsx
export default function Marketplace() {
  return (
    <div className="text-center mt-20">
      <div className="text-6xl mb-4">🚧</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Marketplace</h1>
      <p className="text-gray-500 text-lg">Coming Soon</p>
      <p className="text-gray-400 text-sm mt-2">Fitur trading kartu akan tersedia di versi mendatang.</p>
    </div>
  );
}
```

- [ ] **Step 2: Update Navbar**

```tsx
// frontend/components/Navbar.tsx — tambah Marketplace
const navItems = [
  { href: "/", label: "Home" },
  { href: "/topup", label: "Top Up" },
  { href: "/koleksi", label: "Koleksi" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/profil", label: "Profil" },
];
```

- [ ] **Step 3: Build verifikasi**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/marketplace/ frontend/components/Navbar.tsx
git commit -m "feat: marketplace placeholder 'Coming Soon'"
```

---

## Task 8: Final Verification & Cleanup

**Covers:** Sprint 4 Definition of Done

- [ ] **Step 1: Full build**

```bash
cd frontend && npm run build
```

Expected: Semua routes muncul (Home, Login, Top Up, Koleksi, Marketplace, Profil, API routes)

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: Tidak ada error

- [ ] **Step 3: Update MEMORY.md**

Update Sprint 4 progress:
```markdown
- Sprint 4 progress:
  - [x] Credit system (creditBalance, topUp, deduct)
  - [x] Buy pack deducts credit + mint
  - [x] Request print with simulated Stripe checkout
  - [x] UI: Home dengan pack display
  - [x] UI: Top Up credit page
  - [x] UI: Koleksi page dengan card grid
  - [x] UI: Marketplace "Coming Soon"
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "sprint-4: credit system + UI utama complete"
```

---

## Checklist Sprint 4 Definition of Done

| Kriteria | Verifikasi |
|---|---|
| Top up credit berhasil (simulated Stripe) | `POST /api/credits/topup` |
| Beli pack memotong saldo credit | `POST /api/mint` deducts credit |
| Request print tetap wajib payment terpisah | `POST /api/print/checkout` |
| UI utama bisa dipakai end-to-end | Home → Buy Pack → Koleksi flow |
| Marketplace "Coming Soon" | `/marketplace` page |
| Frontend build sukses | `npm run build` |

---

*Plan ini disusun untuk review sebelum eksekusi Sprint 4.*
