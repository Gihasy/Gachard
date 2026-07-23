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

const RARITY_GLOW = ["", "glow-rare", "glow-epic", "glow-legendary"];
const RARITY_COLORS = ["var(--rarity-common)", "var(--rarity-rare)", "var(--rarity-epic)", "var(--rarity-legendary)"];
const RARITY_LABELS = ["Common", "Rare", "Epic", "Legendary"];

export default function CardItem({ tokenId, templateId, rarity, artworkUrl, status, userId }: CardItemProps) {
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
      className={`card-surface overflow-hidden ${RARITY_GLOW[rarity]}`}
      style={{ borderColor: RARITY_COLORS[rarity] }}
    >
      {artworkUrl ? (
        <img src={artworkUrl} alt={templateId} className="w-full h-48 object-cover" />
      ) : (
        <div className="w-full h-48 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
          <span className="text-4xl">🎴</span>
        </div>
      )}
      <div className="p-3">
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{templateId}</p>
        <div className="flex justify-between items-center mt-1">
          <span className={`tag tag-${RARITY_LABELS[rarity].toLowerCase()}`}>
            {RARITY_LABELS[rarity]}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{
              background: status === "Vaulted" ? "rgba(255,107,186,0.15)" : "rgba(0,204,255,0.15)",
              color: status === "Vaulted" ? "var(--aurora-pink)" : "var(--electric-blue)",
            }}
          >
            {status}
          </span>
        </div>
        {canPrint && (
          <button
            onClick={handleRequestPrint}
            disabled={printing}
            className="mt-2 w-full btn-secondary text-xs py-1.5 disabled:opacity-50"
          >
            {printing ? "Processing..." : "Request Print"}
          </button>
        )}
        {printStatus && (
          <p className="mt-1 text-xs" style={{ color: "var(--silver-mist)" }}>{printStatus}</p>
        )}
        {tokenId && (
          <button
            onClick={() => setShowQR(!showQR)}
            className="mt-1 w-full text-xs py-1.5 rounded"
            style={{ background: "rgba(255,255,255,0.05)", color: "var(--silver-mist)" }}
          >
            {showQR ? "Hide QR" : "Show QR"}
          </button>
        )}
        {showQR && tokenId && (
          <div className="mt-2 flex justify-center">
            <img src={`/api/cards/${tokenId}/qr`} alt={`QR for token ${tokenId}`} className="w-32 h-32" />
          </div>
        )}
      </div>
    </div>
  );
}
