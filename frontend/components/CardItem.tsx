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
