# Sprint 5 — Fitur AI Scan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementasi fitur AI Scan — wajib untuk tema hackathon "AI x Web3". User bisa scan kartu (fisik via QR atau digital) dan melihat metadata lengkap: rarity, status vault, riwayat kepemilikan, flag verifikasi.

**Architecture:** QR code berisi URL dengan tokenId. API route `/api/scan` mengambil data on-chain (status, rarity, owner) dan off-chain (template, artwork) lalu mengembalikan response lengkap. AI vision opsional — fallback ke QR lookup jika waktu tidak cukup.

**Tech Stack:** Next.js 16, ethers.js, MongoDB, QR code generation, optional AI vision API

## Global Constraints

- QR/kode lookup identifikasi presisi `tokenId` (PRD §6)
- Output: rarity, harga terakhir, status vault, riwayat kepemilikan, flag verifikasi (PRD §6)
- AI vision menggunakan API siap pakai, bukan training sendiri (PRD §6)
- Fallback: QR lookup saja jika AI vision tidak sempat (PRD §10)
- Semua transaksi via Next.js API routes (ADR-017)
- Blockchain hidden dari user (ADR-002)

---

## Task 1: Generate QR Code untuk Setiap Kartu

**Covers:** PRD §6 (QR/kode lookup)

**Files:**
- Create: `frontend/lib/qr.ts`
- Create: `frontend/app/api/cards/[tokenId]/qr/route.ts`

**Interfaces:**
- Produces: `generateQRData(tokenId)` → URL string dengan tokenId
- Produces: `GET /api/cards/:tokenId/qr` → QR code image (PNG)

- [ ] **Step 1: Install qrcode package**

```bash
cd frontend && npm install qrcode && npm install -D @types/qrcode
```

- [ ] **Step 2: Buat `lib/qr.ts`**

```typescript
// frontend/lib/qr.ts
import QRCode from "qrcode";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://frontend-rosy-pi-88.vercel.app";

/**
 * Generate QR data URL untuk kartu.
 * QR berisi URL ke halaman scan dengan tokenId.
 */
export function generateQRData(tokenId: number): string {
  return `${BASE_URL}/scan?tokenId=${tokenId}`;
}

/**
 * Generate QR code sebagai data URL (base64 PNG).
 */
export async function generateQRCode(tokenId: number): Promise<string> {
  const data = generateQRData(tokenId);
  return QRCode.toDataURL(data, {
    width: 256,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

/**
 * Generate QR code sebagai PNG buffer.
 */
export async function generateQRCodeBuffer(tokenId: number): Promise<Buffer> {
  const data = generateQRData(tokenId);
  return QRCode.toBuffer(data, {
    width: 256,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
}
```

- [ ] **Step 3: Buat `GET /api/cards/:tokenId/qr`**

```typescript
// frontend/app/api/cards/[tokenId]/qr/route.ts
import { NextResponse } from "next/server";
import { generateQRCodeBuffer } from "@/lib/qr";

export async function GET(
  request: Request,
  { params }: { params: { tokenId: string } }
) {
  try {
    const tokenId = parseInt(params.tokenId);
    if (isNaN(tokenId)) {
      return NextResponse.json({ error: "Invalid tokenId" }, { status: 400 });
    }

    const buffer = await generateQRCodeBuffer(tokenId);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("QR generation error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Build verifikasi**

```bash
cd frontend && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/qr.ts frontend/app/api/cards/\[tokenId\]/qr/
git commit -m "feat: add QR code generation for cards"
```

---

## Task 2: API Route `/api/scan` — Lookup by tokenId

**Covers:** PRD §6 (QR/kode lookup, metadata output)

**Files:**
- Create: `frontend/app/api/scan/route.ts`

**Interfaces:**
- Consumes: `getCardStatus()`, `getCardRarity()`, `getLastOwner()` dari `lib/blockchain.ts`
- Consumes: `getCollection("cards")`, `getCollection("card_templates")` dari `lib/mongodb.ts`
- Produces: `GET /api/scan?tokenId=...` → full card metadata

- [ ] **Step 1: Buat `GET /api/scan`**

```typescript
// frontend/app/api/scan/route.ts
import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { getCardStatus, getCardRarity, getLastOwner } from "@/lib/blockchain";

const STATUS_LABELS = ["Digital", "Vaulted"];
const RARITY_LABELS = ["Common", "Rare", "Epic", "Legendary"];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenIdParam = searchParams.get("tokenId");

    if (!tokenIdParam) {
      return NextResponse.json({ error: "tokenId required" }, { status: 400 });
    }

    const tokenId = parseInt(tokenIdParam);
    if (isNaN(tokenId)) {
      return NextResponse.json({ error: "Invalid tokenId" }, { status: 400 });
    }

    // Get on-chain data
    const [statusOnChain, rarityOnChain, lastOwnerAddress] = await Promise.all([
      getCardStatus(tokenId),
      getCardRarity(tokenId),
      getLastOwner(tokenId),
    ]);

    // Get off-chain data from MongoDB
    const cardsCollection = await getCollection("cards");
    const card = await cardsCollection.findOne({ tokenId });

    let template = null;
    if (card?.templateId) {
      const templatesCollection = await getCollection("card_templates");
      template = await templatesCollection.findOne({ templateId: card.templateId });
    }

    // Get ownership history from transactions
    const txCollection = await getCollection("transactions");
    const history = await txCollection
      .find({ tokenId })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    // Verification flag
    const verified = statusOnChain !== undefined && card !== null;
    const statusMatch = card
      ? STATUS_LABELS[statusOnChain] === card.status
      : false;

    return NextResponse.json({
      tokenId,
      onChain: {
        status: STATUS_LABELS[statusOnChain] || "Unknown",
        statusCode: statusOnChain,
        rarity: RARITY_LABELS[rarityOnChain] || "Unknown",
        rarityCode: rarityOnChain,
        lastOwner: lastOwnerAddress,
      },
      metadata: {
        templateId: card?.templateId || null,
        templateName: template?.name || card?.templateId || null,
        artworkUrl: template?.artworkUrl || null,
      },
      verification: {
        verified,
        statusMatch,
        flag: verified && statusMatch ? "verified" : "warning",
      },
      history: history.map((tx) => ({
        type: tx.type,
        status: tx.status,
        from: tx.fromAddress,
        to: tx.toAddress,
        timestamp: tx.createdAt,
      })),
    });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Build verifikasi**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/scan/
git commit -m "feat: add GET /api/scan endpoint with on-chain + off-chain data"
```

---

## Task 3: UI — Scan Page

**Covers:** PRD §4 (user flow: scan), PRD §6 (output display)

**Files:**
- Create: `frontend/app/scan/page.tsx`
- Modify: `frontend/components/Navbar.tsx` (tambah link Scan)

**Interfaces:**
- Consumes: `GET /api/scan?tokenId=...`
- Produces: Halaman scan dengan card detail + verification flag

- [ ] **Step 1: Buat scan page**

```tsx
// frontend/app/scan/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const RARITY_COLORS = ["text-gray-600", "text-blue-600", "text-purple-600", "text-yellow-600"];
const RARITY_BG = ["bg-gray-50", "bg-blue-50", "bg-purple-50", "bg-yellow-50"];
const STATUS_COLORS = { Digital: "bg-green-100 text-green-700", Vaulted: "bg-red-100 text-red-700" };

function ScanContent() {
  const searchParams = useSearchParams();
  const tokenId = searchParams.get("tokenId");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenId) return;
    setLoading(true);
    setError(null);

    fetch(`/api/scan?tokenId=${tokenId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [tokenId]);

  if (!tokenId) {
    return (
      <div className="text-center mt-20">
        <h1 className="text-3xl font-bold mb-4">Scan Kartu</h1>
        <p className="text-gray-500">Scan QR code pada kartu fisik, atau masukkan Token ID.</p>
        <ManualInput />
      </div>
    );
  }

  if (loading) return <p className="text-center mt-20">Scanning...</p>;
  if (error) return <p className="text-center mt-20 text-red-600">{error}</p>;
  if (!data) return null;

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">Scan Result</h1>

      {/* Card Image */}
      <div className={`rounded-xl overflow-hidden shadow-lg mb-6 ${RARITY_BG[data.onChain.rarityCode]}`}>
        {data.metadata.artworkUrl ? (
          <img src={data.metadata.artworkUrl} alt={data.metadata.templateName} className="w-full h-64 object-cover" />
        ) : (
          <div className="w-full h-64 bg-gray-200 flex items-center justify-center">
            <span className="text-6xl">🎴</span>
          </div>
        )}
      </div>

      {/* Verification Flag */}
      <div className={`text-center mb-4 p-2 rounded-lg ${data.verification.flag === "verified" ? "bg-green-50" : "bg-yellow-50"}`}>
        <span className="text-lg">{data.verification.flag === "verified" ? "✅" : "⚠️"}</span>
        <span className="ml-2 text-sm font-medium">
          {data.verification.flag === "verified" ? "Verified" : "Warning — data mismatch"}
        </span>
      </div>

      {/* Metadata */}
      <div className="bg-white rounded-xl shadow-md p-4 space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-500">Token ID</span>
          <span className="font-mono font-bold">#{data.tokenId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Name</span>
          <span className="font-medium">{data.metadata.templateName || "Unknown"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Rarity</span>
          <span className={`font-bold ${RARITY_COLORS[data.onChain.rarityCode]}`}>{data.onChain.rarity}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Status</span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[data.onChain.status as keyof typeof STATUS_COLORS] || "bg-gray-100"}`}>
            {data.onChain.status}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Last Owner</span>
          <span className="font-mono text-xs">{data.onChain.lastOwner?.slice(0, 6)}...{data.onChain.lastOwner?.slice(-4)}</span>
        </div>
      </div>

      {/* History */}
      {data.history.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold mb-3">History</h2>
          <div className="space-y-2">
            {data.history.map((tx: any, i: number) => (
              <div key={i} className="bg-white rounded-lg p-3 shadow-sm flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium capitalize">{tx.type}</span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded ${tx.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {tx.status}
                  </span>
                </div>
                <span className="text-xs text-gray-400">{new Date(tx.timestamp).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ManualInput() {
  const [input, setInput] = useState("");

  return (
    <div className="mt-6 max-w-sm mx-auto">
      <div className="flex gap-2">
        <input
          type="number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter Token ID"
          className="flex-1 px-4 py-2 border rounded-lg"
        />
        <a
          href={`/scan?tokenId=${input}`}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          Scan
        </a>
      </div>
    </div>
  );
}

export default function Scan() {
  return (
    <Suspense fallback={<p className="text-center mt-20">Loading...</p>}>
      <ScanContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Update Navbar — tambah link Scan**

```tsx
// frontend/components/Navbar.tsx
const navItems = [
  { href: "/", label: "Home" },
  { href: "/topup", label: "Top Up" },
  { href: "/koleksi", label: "Koleksi" },
  { href: "/scan", label: "Scan" },
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
git add frontend/app/scan/ frontend/components/Navbar.tsx
git commit -m "feat: scan page with card metadata display and verification flag"
```

---

## Task 4: QR Code di CardItem — Download/Display

**Covers:** Integrasi QR ke existing UI

**Files:**
- Modify: `frontend/components/CardItem.tsx`

**Interfaces:**
- Consumes: `GET /api/cards/:tokenId/qr`
- Produces: Tombol "Show QR" di CardItem yang menampilkan QR code

- [ ] **Step 1: Update CardItem — tambah QR display**

Tambahkan state dan tombol di `CardItem.tsx`:

```tsx
// Tambah di dalam component, setelah state printing/printStatus
const [showQR, setShowQR] = useState(false);

// Tambah di JSX, setelah printStatus display
{tokenId && (
  <button
    onClick={() => setShowQR(!showQR)}
    className="mt-1 w-full bg-gray-100 text-gray-700 text-xs py-1.5 rounded hover:bg-gray-200"
  >
    {showQR ? "Hide QR" : "Show QR"}
  </button>
)}
{showQR && tokenId && (
  <div className="mt-2 flex justify-center">
    <img src={`/api/cards/${tokenId}/qr`} alt={`QR for token ${tokenId}`} className="w-32 h-32" />
  </div>
)}
```

- [ ] **Step 2: Build verifikasi**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/CardItem.tsx
git commit -m "feat: add QR code display to CardItem"
```

---

## Task 5: AI Vision Integration (Opsional)

**Covers:** PRD §6 (AI vision), PRD §10 (bisa dipotong jika waktu tidak cukup)

**Files:**
- Create: `frontend/lib/vision.ts`
- Create: `frontend/app/api/scan/vision/route.ts`

**Note:** Task ini OPSIONAL. Jika waktu tidak cukup, skip — QR lookup saja sudah memenuhi requirement minimum hackathon.

- [ ] **Step 1: Buat `lib/vision.ts`**

```typescript
// frontend/lib/vision.ts
// Placeholder untuk AI vision integration
// Bisa pakai OpenAI Vision API, Google Vision, atau lainnya

export interface VisionAnalysis {
  matches: boolean;      // artwork cocok dengan metadata?
  condition: string;     // estimasi kondisi fisik (jika scan fisik)
  anomalies: string[];   // deteksi anomali
  confidence: number;    // 0-100
}

/**
 * Analyze card image using AI vision API.
 * Returns analysis result.
 */
export async function analyzeCardImage(
  imageUrl: string,
  expectedTemplateId: string
): Promise<VisionAnalysis> {
  // TODO: Implement with actual vision API
  // For hackathon demo, return mock data
  return {
    matches: true,
    condition: "Good",
    anomalies: [],
    confidence: 95,
  };
}
```

- [ ] **Step 2: Integrasi ke `/api/scan`**

Tambahkan opsi `?vision=true` di `/api/scan` yang memanggil `analyzeCardImage()` dan menambahkan hasilnya ke response.

- [ ] **Step 3: Build + commit**

```bash
git add frontend/lib/vision.ts
git commit -m "feat: add AI vision analysis placeholder for card scan"
```

---

## Task 6: Test End-to-End

**Covers:** Sprint 5 Definition of Done

- [ ] **Step 1: Test QR scan flow**

1. Buka `/koleksi`
2. Klik "Show QR" pada salah satu kartu
3. QR code muncul dengan URL `/scan?tokenId=...`
4. Buka URL tersebut
5. Verifikasi: metadata tampil (rarity, status, artwork, verification flag)

- [ ] **Step 2: Test manual scan**

1. Buka `/scan`
2. Masukkan tokenId manual
3. Verifikasi: data on-chain + off-chain tampil benar

- [ ] **Step 3: Test verification flag**

1. Scan kartu yang statusnya Digital → flag ✅ Verified
2. Scan kartu yang statusnya Vaulted → flag ✅ Verified
3. Scan tokenId yang tidak ada → error message

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "sprint-5: AI scan feature complete"
```

---

## Checklist Sprint 5 Definition of Done

| Kriteria | Verifikasi |
|---|---|
| QR lookup dari kartu ke tokenId | `/api/cards/:tokenId/qr` |
| Scan page dengan metadata lengkap | `/scan?tokenId=...` |
| Output: rarity, status, owner, history | `/api/scan` response |
| Flag verifikasi | ✅ / ⚠️ di scan page |
| Frontend build sukses | `npm run build` |

---

*Plan ini disusun untuk review sebelum eksekusi Sprint 5.*
