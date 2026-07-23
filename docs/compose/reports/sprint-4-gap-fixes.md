# Laporan 6 Gap Fix — Sprint 4 Plan
**Tanggal**: 22 Juli 2026
**Tujuan**: Review kode aktual untuk 6 perbaikan sebelum eksekusi Sprint 4

---

## Gap 1: `confirmTransaction()` — Extract tokenId dari Event Log

**Masalah**: Saat transaksi `mint` dikonfirmasi on-chain, `cards.tokenId` tetap `null`. Tidak ada logika untuk mengambil tokenId sungguhan dari event log.

**Solusi**: Decode `CardMinted` event dari transaction receipt, update `cards` collection.

**File**: `frontend/lib/transactions.ts`

```typescript
// Tambah di bagian atas file
import { ethers } from "ethers";

// ABI fragment untuk decode event CardMinted
const CARD_MINTED_TOPIC = ethers.id("CardMinted(uint256,address,uint8,uint8)");

// Di dalam confirmTransaction(), setelah:
// const newStatus: TxStatus = receipt.status === 1 ? "confirmed" : "failed";

// Tambah logika ini:
if (newStatus === "confirmed" && tx.type === "mint" && receipt.logs) {
  for (const log of receipt.logs) {
    if (
      log.topics[0] === CARD_MINTED_TOPIC &&
      log.address.toLowerCase() === process.env.CONTRACT_ADDRESS?.toLowerCase()
    ) {
      // topics[1] = tokenId (indexed)
      const tokenId = parseInt(log.topics[1], 16);

      // Update cards collection — match by txId
      const cardsCollection = await collection.db.collection("cards");
      await cardsCollection.updateOne(
        { txId: tx._id.toString() },
        {
          $set: {
            tokenId,
            status: "Digital",
            updatedAt: new Date().toISOString(),
          },
        }
      );
      break;
    }
  }
}
```

**Alur**:
```
Frontend polling /api/transactions?txId=...
  → confirmTransaction(txId)
    → getTransactionReceipt(txHash)
    → receipt.status === 1? → "confirmed"
    → decode CardMinted event → extract tokenId
    → update cards.tokenId = tokenId
    → update cards.status = "Digital"
```

---

## Gap 2: Tombol "Request Print" di CardItem.tsx

**Masalah**: Tidak ada cara bagi user untuk request print dari halaman Koleksi.

**Solusi**: Tambah tombol "Request Print" yang hanya muncul untuk kartu Digital dengan tokenId terisi.

**File**: `frontend/components/CardItem.tsx`

```tsx
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

export default function CardItem({
  tokenId, templateId, rarity, artworkUrl, status, userId,
}: CardItemProps) {
  const [printing, setPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  // Tombol muncul HANYA untuk kartu Digital dengan tokenId terisi
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
        body: JSON.stringify({
          userId, tokenId, paymentId: checkoutData.paymentId,
        }),
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
          <span className="text-xs font-semibold text-indigo-600">
            {RARITY_LABELS[rarity]}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              status === "Vaulted"
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
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

**Kondisi tombol muncul**: `status === "Digital" && tokenId !== null`

---

## Gap 3: Refund di `/api/mint` jika Mint Gagal

**Masalah**: Jika `deductCredits()` berhasil tapi `mintCard()` gagal, user kehilangan saldo tanpa dapat kartu.

**Solusi**: Bungkus proses setelah deduct dalam try/catch, panggil `addCredits()` untuk refund jika gagal.

**File**: `frontend/app/api/mint/route.ts`

```typescript
import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { mintCard } from "@/lib/blockchain";
import { pickRarity } from "@/lib/odds";
import { pickCardTemplate, seedCardTemplates } from "@/lib/card-templates";
import { deductCredits, addCredits } from "@/lib/credits";

const PACK_PRICE_CENTS = 299; // $2.99 per pack

export async function POST(request: Request) {
  const { userId } = await request.json();

  const usersCollection = await getCollection("users");
  const user = await usersCollection.findOne({ _id: userId });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Deduct credit FIRST
  let newBalance: number;
  try {
    newBalance = await deductCredits(userId, PACK_PRICE_CENTS);
  } catch {
    return NextResponse.json(
      { error: "Insufficient credit balance", price: PACK_PRICE_CENTS },
      { status: 402 }
    );
  }

  // Bungkus sisa proses — REFUND jika gagal
  try {
    await seedCardTemplates();
    const rarity = await pickRarity();
    const template = await pickCardTemplate(rarity);
    const txHash = await mintCard(user.walletAddress, rarity);

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
    return NextResponse.json(
      { error: "Mint failed, credit refunded" },
      { status: 500 }
    );
  }
}
```

**Alur refund**:
```
deductCredits(299) → success
  → mintCard() → GAGAL
    → addCredits(299) → refund
    → return error "Mint failed, credit refunded"
```

---

## Gap 4: Reveal Inline di Home Page (bukan alert)

**Masalah**: `alert()` untuk menampilkan hasil reveal — UX buruk, tidak menampilkan artwork.

**Solusi**: Tampilkan card reveal inline di halaman Home dengan artwork, warna rarity, dan link ke Koleksi.

**File**: `frontend/app/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PackCard from "@/components/PackCard";

const RARITY_COLORS = [
  "border-gray-300", "border-blue-400", "border-purple-400", "border-yellow-400",
];
const RARITY_BG = [
  "bg-gray-50", "bg-blue-50", "bg-purple-50", "bg-yellow-50",
];
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
    if (!user) { router.push("/login"); return; }
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
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Selamat Datang di Gachard
      </h1>
      <p className="text-gray-600 mb-8">
        Platform kartu TCG digital-native dengan mekanisme lock-vault-redeem.
      </p>

      {user && balance !== null && (
        <div className="bg-indigo-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-indigo-700">
            Saldo Credit:{" "}
            <span className="font-bold">${(balance / 100).toFixed(2)}</span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PackCard price={299} onBuy={handleBuyPack} loading={loading} />
      </div>

      {/* Reveal inline — bukan alert */}
      {reveal && !reveal.error && (
        <div className="mt-8 text-center">
          <h2 className="text-xl font-bold mb-4">Pack Dibuka!</h2>
          <div
            className={`inline-block rounded-xl overflow-hidden shadow-lg border-2 ${
              RARITY_COLORS[reveal.rarity]
            } ${RARITY_BG[reveal.rarity]}`}
          >
            {reveal.template?.artworkUrl ? (
              <img
                src={reveal.template.artworkUrl}
                alt={reveal.template.name}
                className="w-48 h-64 object-cover"
              />
            ) : (
              <div className="w-48 h-64 bg-gray-200 flex items-center justify-center">
                <span className="text-6xl">🎴</span>
              </div>
            )}
            <div className="p-4">
              <p className="font-semibold">{reveal.template?.name}</p>
              <p
                className={`text-sm font-bold ${
                  reveal.rarity >= 2 ? "text-purple-600" : "text-gray-600"
                }`}
              >
                {RARITY_LABELS[reveal.rarity]}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            <a href="/koleksi" className="text-indigo-600 underline">
              Lihat di Koleksi →
            </a>
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

---

## Gap 5: Fix Teks PackCard.tsx

**Masalah**: Teks "5 kartu random, 1 guaranteed Rare+" tidak sesuai perilaku backend (1 kartu per mint).

**Solusi**: Ganti dengan "1 kartu random per pembelian".

**File**: `frontend/components/PackCard.tsx`

```tsx
// Sebelum:
<p className="text-gray-500 text-sm mb-4">5 kartu random, 1 guaranteed Rare+</p>

// Sesudah:
<p className="text-gray-500 text-sm mb-4">1 kartu random per pembelian</p>
```

Juga terima `loading` prop dari parent (bukan manage sendiri):

```tsx
interface PackCardProps {
  price: number;
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

---

## Gap 6: `GET /api/cards` — Lookup artworkUrl dari card_templates

**Masalah**: Response `/api/cards` tidak include `artworkUrl`, sehingga Koleksi selalu menampilkan placeholder emoji.

**Solusi**: Join `cards` collection dengan `card_templates` berdasarkan `templateId`.

**File**: `frontend/app/api/cards/route.ts`

```typescript
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

**Response sebelum (tanpa lookup)**:
```json
{"cards": [{"tokenId": null, "templateId": "common-1", "rarity": 0, "status": "pending"}]}
```

**Response sesudah (dengan lookup)**:
```json
{"cards": [{"tokenId": 1, "templateId": "common-1", "rarity": 0, "status": "Digital", "artworkUrl": "/cards/common-1.png", "templateName": "Common Card A"}]}
```

---

## Ringkasan

| Gap | File | Masalah | Solusi |
|---|---|---|---|
| 1 | `lib/transactions.ts` | tokenId tidak pernah diisi | Decode CardMinted event, update cards collection |
| 2 | `components/CardItem.tsx` | Tidak ada tombol Request Print | Tombol muncul untuk kartu Digital + tokenId terisi |
| 3 | `app/api/mint/route.ts` | Tidak ada refund jika mint gagal | try/catch + addCredits() untuk refund |
| 4 | `app/page.tsx` | alert() untuk reveal | Inline card display dengan artwork + rarity colors |
| 5 | `components/PackCard.tsx` | Teks salah "5 kartu" | "1 kartu random per pembelian" |
| 6 | `app/api/cards/route.ts` | artworkUrl tidak pernah diisi | Join dengan card_templates collection |

---

*Laporan ini disusun untuk review kode aktual sebelum eksekusi Sprint 4.*
