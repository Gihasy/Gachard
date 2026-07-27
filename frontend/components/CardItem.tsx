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

export default function CardItem({
  tokenId,
  templateId,
  artworkUrl,
  status,
  userId,
}: CardItemProps) {
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
        setPrintStatus("Print confirmed! Refreshing...");
        setTimeout(() => window.location.reload(), 1000);
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
      className="glass glass-hover overflow-hidden p-3"
      style={{ borderColor: "rgba(255,255,255,0.1)" }}
      data-testid={`card-item-${tokenId ?? templateId}`}
    >
      <div className="relative w-full rounded-xl overflow-hidden mb-3 bg-white/5" style={{ aspectRatio: "5/7" }}>
        {artworkUrl ? (
          <Image
            src={artworkUrl}
            alt={templateId}
            fill
            sizes="(max-width:768px) 45vw, 25vw"
            className="object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl text-white/40">◆</span>
          </div>
        )}
      </div>

      <div className="px-1.5 pb-1.5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-white truncate">
            {tokenId !== null ? `Card #${tokenId}` : templateId}
          </p>
          <span
            className="text-[0.62rem] uppercase tracking-widest px-2 py-0.5 rounded"
            style={{
              background:
                (status === "Print Requested" || status === "Real")
                  ? "rgba(255,107,186,0.15)"
                  : "rgba(0,204,255,0.15)",
              color:
                (status === "Print Requested" || status === "Real")
                  ? "var(--aurora-pink)"
                  : "var(--electric-blue)",
              border: `1px solid ${
                (status === "Print Requested" || status === "Real")
                  ? "rgba(255,107,186,0.35)"
                  : "rgba(0,204,255,0.35)"
              }`,
            }}
          >
            {status}
          </span>
        </div>

        <div>
          {canPrint && (
            <button
              onClick={handleRequestPrint}
              disabled={printing}
              className="btn-ghost !py-2 !px-3 !text-[0.65rem] disabled:opacity-50 w-full"
              data-testid={`request-print-${tokenId}`}
            >
              {printing ? "…" : "Print"}
            </button>
          )}
          {(status === "Print Requested" || status === "Real") && (
            <div
              className="text-center text-[0.65rem] text-white/40 py-1"
              data-testid={`printed-notice-${tokenId}`}
            >
              {status === "Real"
                ? "Physical card — redeem code on card"
                : "Print in progress"}
            </div>
          )}
        </div>

        {printStatus && (
          <p className="mt-2 text-[0.7rem] text-white/60 leading-relaxed">
            {printStatus}
          </p>
        )}
      </div>
    </div>
  );
}
