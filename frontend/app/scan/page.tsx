"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import PageShell from "@/components/PageShell";
import QRScanner from "@/components/QRScanner";

const RARITY_COLORS = [
  "var(--rarity-common)",
  "var(--rarity-rare)",
  "var(--rarity-epic)",
  "var(--rarity-legendary)",
];
const RARITY_GLOW = ["", "glow-rare", "glow-epic", "glow-legendary"];
const RARITY_LABELS = ["Common", "Rare", "Epic", "Legendary"];

interface ScanTx {
  type: string;
  status: string;
  timestamp: string | number;
  from?: string;
  to?: string;
}

interface ScanData {
  tokenId: string | number;
  onChain: {
    rarityCode: number;
    rarity: string;
    status: string;
    lastOwner?: string;
  };
  metadata: {
    templateName?: string;
    artworkUrl?: string;
  };
  verification: { flag: "verified" | "warning" | string };
  history?: ScanTx[];
  purchasePrice: number | null;
}

function ScanContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenId = searchParams.get("tokenId");
  const [data, setData] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const handleScan = useCallback(
    (scannedTokenId: string) => {
      setShowScanner(false);
      router.push(`/scan?tokenId=${scannedTokenId}`);
    },
    [router]
  );

  useEffect(() => {
    if (!tokenId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/scan?tokenId=${tokenId}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) setError(d.error);
        else setData(d as ScanData);
      })
      .catch(() => {
        if (!cancelled) setError("Network error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tokenId]);

  // Landing state — no token yet
  if (!tokenId) {
    return (
      <>
        {showScanner && (
          <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
        )}
        <PageShell
          testId="scan-page"
          eyebrow="Verify Authenticity"
          title={
            <>
              Scan a <span className="text-gradient-aurora">card</span>
            </>
          }
          description="Every Gachard card carries a unique on-chain signature. Scan its QR code with your camera or enter the Card ID below to verify ownership, rarity, and history."
        >
          <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] items-start">
            <ScanInstructions onOpenCamera={() => setShowScanner(true)} />
            <ManualInput />
          </div>
        </PageShell>
      </>
    );
  }

  return (
    <PageShell
      testId="scan-result-page"
      eyebrow={`Token #${tokenId}`}
      title={
        <>
          Scan <span className="text-gradient-aurora">Result</span>
        </>
      }
    >
      {loading && (
        <div
          className="glass p-14 text-center"
          data-testid="scan-loading"
        >
          <div
            className="w-10 h-10 mx-auto rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "var(--cosmic-violet)", borderTopColor: "transparent" }}
          />
          <p className="mt-5 text-white/70 uppercase tracking-widest text-xs">
            Scanning…
          </p>
        </div>
      )}

      {error && !loading && (
        <div
          className="glass p-10 text-center max-w-xl mx-auto"
          data-testid="scan-error"
          style={{ borderColor: "rgba(255,107,186,0.35)" }}
        >
          <p style={{ color: "var(--aurora-pink)" }} className="uppercase tracking-widest text-sm mb-2">
            Error
          </p>
          <p className="text-white/70">{error}</p>
        </div>
      )}

      {data && !loading && (
        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]" data-testid="scan-result">
          {/* Card artwork */}
          <div
            className={`glass overflow-hidden ${RARITY_GLOW[data.onChain.rarityCode]}`}
            style={{ borderColor: RARITY_COLORS[data.onChain.rarityCode] }}
          >
            <div className="relative w-full bg-white/5" style={{ aspectRatio: "5/7" }}>
              {data.metadata.artworkUrl ? (
                <Image
                  src={data.metadata.artworkUrl}
                  alt={data.metadata.templateName || "Card"}
                  fill
                  sizes="(max-width:1024px) 100vw, 40vw"
                  className="object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-5xl text-white/30">◆</span>
                </div>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="space-y-4">
            {/* Verification */}
            <div
              className="flex items-center gap-3 p-4 rounded-2xl"
              style={{
                background:
                  data.verification.flag === "verified"
                    ? "rgba(0,204,255,0.08)"
                    : "rgba(255,196,102,0.08)",
                border:
                  data.verification.flag === "verified"
                    ? "1px solid rgba(0,204,255,0.35)"
                    : "1px solid rgba(255,196,102,0.35)",
              }}
              data-testid="scan-verification"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background:
                    data.verification.flag === "verified"
                      ? "rgba(0,204,255,0.18)"
                      : "rgba(255,196,102,0.18)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  {data.verification.flag === "verified" ? (
                    <path
                      d="M5 12l4 4 10-10"
                      stroke="var(--electric-blue)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : (
                    <path
                      d="M12 3l10 18H2L12 3zm0 6v5m0 3v.5"
                      stroke="var(--aurora-gold)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
              </div>
              <div>
                <p
                  className="text-sm font-semibold uppercase tracking-wide"
                  style={{
                    color:
                      data.verification.flag === "verified"
                        ? "var(--electric-blue)"
                        : "var(--aurora-gold)",
                  }}
                >
                  {data.verification.flag === "verified"
                    ? "Verified authentic"
                    : "Warning — data mismatch"}
                </p>
                <p className="text-xs text-white/60 mt-0.5">
                  Signature validated against on-chain record.
                </p>
              </div>
            </div>

            {/* Metadata */}
            <div className="glass p-5">
              <MetaRow label="Card ID" value={`#${data.tokenId}`} mono />
              <MetaRow
                label="Name"
                value={data.metadata.templateName || "Unknown"}
              />
              <MetaRow
                label="Rarity"
                value={
                  <span className={`tag tag-${RARITY_LABELS[data.onChain.rarityCode].toLowerCase()}`}>
                    {data.onChain.rarity}
                  </span>
                }
              />
              <MetaRow
                label="Status"
                value={
                  <span
                    className="text-[0.65rem] uppercase tracking-widest px-2 py-0.5 rounded"
                    style={{
                      background:
                        data.onChain.status === "Print Requested"
                          ? "rgba(255,107,186,0.15)"
                          : "rgba(0,204,255,0.15)",
                      color:
                        data.onChain.status === "Print Requested"
                          ? "var(--aurora-pink)"
                          : "var(--electric-blue)",
                      border: `1px solid ${
                        data.onChain.status === "Print Requested"
                          ? "rgba(255,107,186,0.35)"
                          : "rgba(0,204,255,0.35)"
                      }`,
                    }}
                  >
                    {data.onChain.status}
                  </span>
                }
              />
              <MetaRow
                label="Last Owner"
                value={
                  <span className="text-sm text-white/70">
                    {data.onChain.lastOwner || "—"}
                  </span>
                }
              />
              {data.purchasePrice !== null && (
                <MetaRow
                  label="Purchase Price"
                  value={
                    <span
                      className="font-semibold"
                      style={{ color: "var(--aurora-gold)" }}
                    >
                      {data.purchasePrice} Credit
                    </span>
                  }
                  last
                />
              )}
            </div>

            {/* History */}
            {data.history && data.history.length > 0 && (
              <div className="glass p-5" data-testid="scan-history">
                <p className="text-[0.72rem] uppercase tracking-[0.22em] mb-4" style={{ color: "var(--cosmic-violet)" }}>
                  Transaction History
                </p>
                <div className="space-y-2">
                  {data.history.map((tx, i) => (
                    <div
                      key={`${tx.type}-${tx.timestamp}-${i}`}
                      className="flex justify-between items-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-medium capitalize text-white shrink-0">
                          {tx.type}
                        </span>
                        <span
                          className="text-[0.6rem] uppercase tracking-widest px-2 py-0.5 rounded shrink-0"
                          style={{
                            background:
                              tx.status === "Success"
                                ? "rgba(0,204,255,0.15)"
                                : "rgba(255,196,102,0.15)",
                            color:
                              tx.status === "Success"
                                ? "var(--electric-blue)"
                                : "var(--aurora-gold)",
                          }}
                        >
                          {tx.status}
                        </span>
                        {tx.from && tx.to && (
                          <span className="text-[0.65rem] text-white/40 truncate">
                            {tx.from} → {tx.to}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-white/50 shrink-0 ml-3">
                        {new Date(tx.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}

function MetaRow({
  label,
  value,
  mono = false,
  last = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={`flex justify-between items-center py-3 ${
        !last ? "border-b border-white/[0.06]" : ""
      }`}
    >
      <span className="text-xs uppercase tracking-widest text-white/50">
        {label}
      </span>
      <span
        className={`text-sm text-white ${mono ? "font-mono font-bold" : "font-medium"}`}
      >
        {value}
      </span>
    </div>
  );
}

function ScanInstructions({ onOpenCamera }: { onOpenCamera: () => void }) {
  const steps = [
    {
      t: "Locate the QR",
      d: "Every Gachard card has a QR code on the bottom-right corner.",
    },
    {
      t: "Scan with your camera",
      d: "Tap the button below to open your device camera and scan instantly.",
    },
    {
      t: "Get instant proof",
      d: "You'll see ownership, rarity, and full transaction history.",
    },
  ];
  return (
    <div className="glass p-8" data-testid="scan-instructions">
      <p className="text-[0.72rem] uppercase tracking-[0.22em] mb-4" style={{ color: "var(--cosmic-violet)" }}>
        How to scan
      </p>
      <div className="space-y-5 mb-6">
        {steps.map((s, i) => (
          <div key={s.t} className="flex gap-4">
            <span
              className="font-display text-2xl leading-none shrink-0 w-9"
              style={{ color: "var(--cosmic-violet)" }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <p className="font-medium text-white text-sm mb-0.5">{s.t}</p>
              <p className="text-xs text-white/60 leading-relaxed">{s.d}</p>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onOpenCamera}
        className="w-full py-3.5 rounded-2xl text-sm font-medium transition-all hover:scale-[1.02]"
        style={{
          background: "linear-gradient(135deg, var(--cosmic-violet), var(--electric-blue))",
          color: "#fff",
          boxShadow: "0 8px 24px rgba(138,92,255,0.3)",
        }}
        data-testid="scan-camera-btn"
      >
        <span className="flex items-center justify-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          Open Camera
        </span>
      </button>
    </div>
  );
}

function ManualInput() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) router.push(`/scan?tokenId=${input.trim()}`);
  };
  return (
    <form
      onSubmit={submit}
      className="glass p-8"
      data-testid="scan-manual-form"
    >
      <p className="text-[0.72rem] uppercase tracking-[0.22em] mb-4" style={{ color: "var(--cosmic-violet)" }}>
        Or enter manually
      </p>
      <label className="block text-sm text-white/70 mb-2">Card ID</label>
      <div
        className="flex items-center gap-2 p-1 pl-4 rounded-full mb-4"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <input
          type="number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. 108"
          className="flex-1 bg-transparent outline-none text-white text-sm placeholder:text-white/40"
          data-testid="scan-token-input"
        />
      </div>
      <button
        type="submit"
        disabled={!input.trim()}
        className="btn-primary w-full disabled:opacity-50"
        data-testid="scan-submit-btn"
      >
        Verify Card
      </button>
      <p className="mt-4 text-xs text-white/50 leading-relaxed">
        Card IDs are numeric. If you don't have one, scan a card's QR with
        your camera to jump straight to the result.
      </p>
    </form>
  );
}

export default function Scan() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 py-20">
          <div className="glass p-12 text-center text-white/60">Loading…</div>
        </div>
      }
    >
      <ScanContent />
    </Suspense>
  );
}
