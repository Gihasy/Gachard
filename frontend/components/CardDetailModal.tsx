"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const RARITY_COLORS = [
  "var(--rarity-common)",
  "var(--rarity-rare)",
  "var(--rarity-epic)",
  "var(--rarity-legendary)",
];
const RARITY_GLOW = ["", "glow-rare", "glow-epic", "glow-legendary"];
const RARITY_LABELS = ["Common", "Rare", "Epic", "Legendary"];

interface ScanTx {
  invoiceId?: string;
  type: string;
  status: string;
  timestamp: string | number;
  from?: string;
  to?: string;
}

interface ScanData {
  cardId?: string | null;
  tokenId: string | number | null;
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

export default function CardDetailModal({
  cardId,
  tokenId,
  onClose,
}: {
  cardId?: string | null;
  tokenId: number | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = cardId || tokenId;
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/scan?cardId=${id}`)
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
  }, [cardId, tokenId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
      data-testid="card-detail-modal"
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl"
        style={{
          background: "rgba(15,19,36,0.97)",
          border: "1px solid rgba(184,172,255,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 sticky top-0 z-10" style={{ background: "rgba(15,19,36,0.97)" }}>
          <p className="text-[0.72rem] uppercase tracking-[0.22em]" style={{ color: "var(--cosmic-violet)" }}>
            Card Details
          </p>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:brightness-125"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
            data-testid="card-detail-close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {loading && (
            <div className="py-16 text-center">
              <div
                className="w-10 h-10 mx-auto rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: "var(--cosmic-violet)", borderTopColor: "transparent" }}
              />
              <p className="mt-5 text-white/70 uppercase tracking-widest text-xs">Loading…</p>
            </div>
          )}

          {error && (
            <div className="py-16 text-center">
              <p style={{ color: "var(--aurora-pink)" }} className="uppercase tracking-widest text-sm mb-2">Error</p>
              <p className="text-white/70">{error}</p>
            </div>
          )}

          {data && (
            <div className="grid gap-6 sm:grid-cols-[1fr_1.3fr]">
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
                      sizes="(max-width:640px) 100vw, 30vw"
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
              <div className="space-y-3">
                {/* Verification */}
                <div
                  className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{
                    background: data.verification.flag === "verified" ? "rgba(0,204,255,0.08)" : "rgba(255,196,102,0.08)",
                    border: data.verification.flag === "verified" ? "1px solid rgba(0,204,255,0.35)" : "1px solid rgba(255,196,102,0.35)",
                  }}
                  data-testid="modal-verification"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: data.verification.flag === "verified" ? "rgba(0,204,255,0.18)" : "rgba(255,196,102,0.18)",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      {data.verification.flag === "verified" ? (
                        <path d="M5 12l4 4 10-10" stroke="var(--electric-blue)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      ) : (
                        <path d="M12 3l10 18H2L12 3zm0 6v5m0 3v.5" stroke="var(--aurora-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      )}
                    </svg>
                  </div>
                  <div>
                    <p
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: data.verification.flag === "verified" ? "var(--electric-blue)" : "var(--aurora-gold)" }}
                    >
                      {data.verification.flag === "verified" ? "Verified authentic" : "Warning — data mismatch"}
                    </p>
                    <p className="text-[0.6rem] text-white/60 mt-0.5">Signature validated against verified record.</p>
                  </div>
                </div>

                {/* Metadata */}
                <div className="glass p-4">
                  <MetaRow label="Card ID" value={`#${data.cardId || data.tokenId}`} mono />
                  <MetaRow label="Name" value={data.metadata.templateName || "Unknown"} />
                  <MetaRow
                    label="Rarity"
                    value={
                      <span className={`tag tag-${RARITY_LABELS[data.onChain.rarityCode].toLowerCase()} text-[0.6rem]`}>
                        {data.onChain.rarity}
                      </span>
                    }
                  />
                  <MetaRow
                    label="Status"
                    value={
                      <span
                        className="text-[0.6rem] uppercase tracking-widest px-2 py-0.5 rounded"
                        style={{
                          background: data.onChain.status === "Print Requested" ? "rgba(255,107,186,0.15)" : "rgba(0,204,255,0.15)",
                          color: data.onChain.status === "Print Requested" ? "var(--aurora-pink)" : "var(--electric-blue)",
                          border: `1px solid ${data.onChain.status === "Print Requested" ? "rgba(255,107,186,0.35)" : "rgba(0,204,255,0.35)"}`,
                        }}
                      >
                        {data.onChain.status}
                      </span>
                    }
                  />
                  <MetaRow label="Last Owner" value={<span className="text-xs text-white/70">{data.onChain.lastOwner || "—"} </span>} />
                  {data.purchasePrice !== null && (
                    <MetaRow
                      label="Purchase Price"
                      value={<span className="font-semibold text-xs" style={{ color: "var(--aurora-gold)" }}>{data.purchasePrice} Credit</span>}
                      last
                    />
                  )}
                </div>

                {/* History */}
                {data.history && data.history.length > 0 && (
                  <div className="glass p-4" data-testid="modal-history">
                    <p className="text-[0.65rem] uppercase tracking-[0.22em] mb-3" style={{ color: "var(--cosmic-violet)" }}>
                      Transaction History
                    </p>
                    <div className="space-y-1.5">
                      {data.history.map((tx, i) => (
                        <div
                          key={`${tx.type}-${tx.timestamp}-${i}`}
                          className="flex justify-between items-center p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {tx.invoiceId && (
                              <span className="text-[0.55rem] font-mono text-white/40 shrink-0">{tx.invoiceId}</span>
                            )}
                            <span className="text-xs font-medium capitalize text-white shrink-0">{tx.type}</span>
                            <span
                              className="text-[0.55rem] uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0"
                              style={{
                                background: tx.status === "Success" ? "rgba(0,204,255,0.15)" : "rgba(255,196,102,0.15)",
                                color: tx.status === "Success" ? "var(--electric-blue)" : "var(--aurora-gold)",
                              }}
                            >
                              {tx.status}
                            </span>
                            {tx.from && tx.to && (
                              <span className="text-[0.6rem] text-white/40 truncate">{tx.from} → {tx.to}</span>
                            )}
                          </div>
                          <span className="text-[0.6rem] text-white/50 shrink-0 ml-2">
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
        </div>
      </div>
    </div>
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
    <div className={`flex justify-between items-center py-2 ${!last ? "border-b border-white/[0.06]" : ""}`}>
      <span className="text-[0.6rem] uppercase tracking-widest text-white/50">{label}</span>
      <span className={`text-xs text-white ${mono ? "font-mono font-bold" : "font-medium"}`}>{value}</span>
    </div>
  );
}
