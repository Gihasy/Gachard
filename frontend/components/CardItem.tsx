"use client";

import { useState } from "react";
import Image from "next/image";

interface CardItemProps {
  tokenId: number | null;
  templateId: string;
  rarity: number;
  artworkUrl: string;
  status: string;
  userId: string;
}

const RARITY_GLOW = ["", "glow-rare", "glow-epic", "glow-legendary"];
const RARITY_COLORS = [
  "var(--rarity-common)",
  "var(--rarity-rare)",
  "var(--rarity-epic)",
  "var(--rarity-legendary)",
];
const RARITY_LABELS = ["Common", "Rare", "Epic", "Legendary"];

export default function CardItem({
  tokenId,
  templateId,
  rarity,
  artworkUrl,
  status,
  userId,
}: CardItemProps) {
  const [printing, setPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  const canPrint = status === "Digital" && tokenId !== null;

  const handleRequestPrint = async () => {
    if (!tokenId) return;
    setPrinting(true);
    setPrintStatus(null);
    try {
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
    <div
      className={`glass glass-hover overflow-hidden p-3 ${RARITY_GLOW[rarity]}`}
      style={{ borderColor: RARITY_COLORS[rarity] }}
      data-testid={`card-item-${tokenId ?? templateId}`}
    >
      <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden mb-3 bg-white/5">
        {artworkUrl ? (
          <Image
            src={artworkUrl}
            alt={templateId}
            fill
            sizes="(max-width:768px) 45vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl text-white/40">◆</span>
          </div>
        )}
        <div
          className="absolute top-2.5 right-2.5 text-[0.6rem] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
          style={{
            background: "rgba(11,14,26,0.72)",
            backdropFilter: "blur(6px)",
            color: RARITY_COLORS[rarity],
            border: `1px solid ${RARITY_COLORS[rarity]}`,
          }}
        >
          {RARITY_LABELS[rarity]}
        </div>
      </div>

      <div className="px-1.5 pb-1.5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-white truncate">{templateId}</p>
          <span
            className="text-[0.62rem] uppercase tracking-widest px-2 py-0.5 rounded"
            style={{
              background:
                status === "Vaulted"
                  ? "rgba(255,107,186,0.15)"
                  : "rgba(0,204,255,0.15)",
              color:
                status === "Vaulted"
                  ? "var(--aurora-pink)"
                  : "var(--electric-blue)",
              border: `1px solid ${
                status === "Vaulted"
                  ? "rgba(255,107,186,0.35)"
                  : "rgba(0,204,255,0.35)"
              }`,
            }}
          >
            {status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {canPrint && (
            <button
              onClick={handleRequestPrint}
              disabled={printing}
              className="btn-ghost !py-2 !px-3 !text-[0.65rem] disabled:opacity-50"
              data-testid={`request-print-${tokenId}`}
            >
              {printing ? "…" : "Print"}
            </button>
          )}
          {tokenId && (
            <button
              onClick={() => setShowQR(!showQR)}
              className="btn-ghost !py-2 !px-3 !text-[0.65rem]"
              style={
                !canPrint
                  ? ({ gridColumn: "span 2" } as React.CSSProperties)
                  : undefined
              }
              data-testid={`toggle-qr-${tokenId}`}
            >
              {showQR ? "Hide QR" : "Show QR"}
            </button>
          )}
        </div>

        {printStatus && (
          <p className="mt-2 text-[0.7rem] text-white/60 leading-relaxed">
            {printStatus}
          </p>
        )}

        {showQR && tokenId && (
          <div className="mt-3 flex justify-center bg-white p-2 rounded-lg">
            <img
              src={`/api/cards/${tokenId}/qr`}
              alt={`QR for token ${tokenId}`}
              className="w-32 h-32"
            />
          </div>
        )}
      </div>
    </div>
  );
}
