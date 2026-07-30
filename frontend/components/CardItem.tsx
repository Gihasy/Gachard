"use client";

import { useState } from "react";
import Image from "next/image";

const RARITY_COLORS = [
  "var(--rarity-common)",
  "var(--rarity-rare)",
  "var(--rarity-epic)",
  "var(--rarity-legendary)",
];
const RARITY_GLOW = ["", "glow-rare", "glow-epic", "glow-legendary"];
const RARITY_LABELS = ["Common", "Rare", "Epic", "Legendary"];

interface CardItemProps {
  cardId?: string | null;
  tokenId: number | null;
  templateId: string;
  templateName?: string;
  rarity: number;
  artworkUrl: string;
  status: string;
  userId: string;
}

interface ShippingForm {
  recipientName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  phone: string;
}

const EMPTY_FORM: ShippingForm = {
  recipientName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  postalCode: "",
  phone: "",
};

export default function CardItem({
  cardId,
  tokenId,
  templateId,
  templateName,
  rarity,
  artworkUrl,
  status,
  userId,
}: CardItemProps) {
  const [printing, setPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ShippingForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const canPrint = status === "Digital" && tokenId !== null;
  const isInProgress = status === "In Progress";
  const isReal = status === "Real";

  const isFormValid =
    form.recipientName.trim() &&
    form.addressLine1.trim() &&
    form.city.trim() &&
    form.postalCode.trim() &&
    form.phone.trim();

  const handleFormChange = (field: keyof ShippingForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormError(null);
  };

  const handleRequestPrint = async () => {
    if (!tokenId) return;
    if (!isFormValid) {
      setFormError("Please fill in all required fields.");
      return;
    }

    setPrinting(true);
    setPrintStatus(null);
    setFormError(null);
    try {
      // Step 1: Checkout with shipping address
      const checkoutRes = await fetch("/api/print/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          tokenId,
          shippingAddress: {
            recipientName: form.recipientName.trim(),
            addressLine1: form.addressLine1.trim(),
            addressLine2: form.addressLine2.trim(),
            city: form.city.trim(),
            postalCode: form.postalCode.trim(),
            phone: form.phone.trim(),
          },
        }),
      });
      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) {
        setPrintStatus(checkoutData.error || "Checkout failed");
        return;
      }

      // Step 2: Request print
      const printRes = await fetch("/api/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tokenId, paymentId: checkoutData.paymentId }),
      });
      const printData = await printRes.json();
      if (printRes.ok) {
        setPrintStatus("Print confirmed! Refreshing...");
        setShowForm(false);
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

  const rarityLevel = Math.max(0, Math.min(3, rarity)) as 0 | 1 | 2 | 3;

  return (
    <>
      <div
        className={`glass glass-hover overflow-hidden p-2 sm:p-2.5 ${RARITY_GLOW[rarityLevel]}`}
        style={{ borderColor: RARITY_COLORS[rarityLevel] }}
        data-testid={`card-item-${tokenId ?? templateId}`}
      >
        <div className="relative w-full rounded-xl overflow-hidden mb-2 bg-white/5" style={{ aspectRatio: "5/7" }}>
          {artworkUrl ? (
            <Image
              src={artworkUrl}
              alt={templateId}
              fill
              sizes="(max-width:768px) 40vw, 20vw"
              className="object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-3xl text-white/30">◆</span>
            </div>
          )}
        </div>

        <div className="px-1 pb-1">
          <p className="text-xs font-medium text-white truncate">
            {cardId ? `Card ID: #${cardId}` : tokenId !== null ? `Card #${tokenId}` : templateId}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-1 mt-1">
            <span
              className={`tag tag-${RARITY_LABELS[rarityLevel].toLowerCase()} text-[0.55rem]`}
            >
              {RARITY_LABELS[rarityLevel]}
            </span>
            <span
              className="text-[0.55rem] uppercase tracking-widest px-1.5 py-0.5 rounded whitespace-nowrap"
              style={{
                background: isReal
                  ? "rgba(0,255,136,0.15)"
                  : isInProgress
                  ? "rgba(255,196,102,0.15)"
                  : "rgba(0,204,255,0.15)",
                color: isReal
                  ? "#00ff88"
                  : isInProgress
                  ? "var(--aurora-gold)"
                  : "#00ccff",
              }}
            >
              {status}
            </span>
          </div>

          {/* Action buttons */}
          <div className="mt-2">
            {status === "Digital" && (
              tokenId !== null ? (
                <button
                  onClick={() => setShowForm(true)}
                  disabled={printing}
                  className="btn-ghost !py-2 !px-3 !text-[0.65rem] disabled:opacity-50 w-full"
                  data-testid={`request-print-${tokenId}`}
                >
                  {printing ? "…" : "Print"}
                </button>
              ) : (
                <div
                  className="text-center text-[0.6rem] uppercase tracking-widest py-1.5 rounded-lg"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    color: "rgba(255,255,255,0.25)",
                  }}
                >
                  Pending…
                </div>
              )
            )}
            {isInProgress && (
              <div
                className="text-center text-[0.65rem] py-1"
                style={{ color: "var(--aurora-gold)" }}
                data-testid={`printed-notice-${tokenId}`}
              >
                In Progress
              </div>
            )}
            {isReal && (
              <div
                className="text-center text-[0.65rem] py-1"
                style={{ color: "#00ff88" }}
                data-testid={`printed-notice-${tokenId}`}
              >
                Physical card — redeem code on card
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

      {/* Shipping Address Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
          onClick={() => setShowForm(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl overflow-hidden"
            style={{
              background: "rgba(15,19,36,0.95)",
              border: "1px solid rgba(184,172,255,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.22em]" style={{ color: "var(--cosmic-violet)" }}>
                  Shipping Address
                </p>
                <p className="text-sm text-white/60 mt-1">
                  Print + Shipping — $14.99
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              <FormField label="Recipient Name *" value={form.recipientName} onChange={(v) => handleFormChange("recipientName", v)} placeholder="Full name" />
              <FormField label="Address Line 1 *" value={form.addressLine1} onChange={(v) => handleFormChange("addressLine1", v)} placeholder="Street address" />
              <FormField label="Address Line 2" value={form.addressLine2} onChange={(v) => handleFormChange("addressLine2", v)} placeholder="Apt, suite, unit (optional)" />
              <div className="grid grid-cols-2 gap-3">
                <FormField label="City *" value={form.city} onChange={(v) => handleFormChange("city", v)} placeholder="City" />
                <FormField label="Postal Code *" value={form.postalCode} onChange={(v) => handleFormChange("postalCode", v)} placeholder="Postal code" />
              </div>
              <FormField label="Phone *" value={form.phone} onChange={(v) => handleFormChange("phone", v)} placeholder="Phone number" type="tel" />

              {formError && (
                <p className="text-xs" style={{ color: "var(--aurora-pink)" }}>{formError}</p>
              )}

              <button
                onClick={handleRequestPrint}
                disabled={printing || !isFormValid}
                className="w-full py-3 rounded-2xl text-sm font-medium transition-all disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, var(--cosmic-violet), var(--electric-blue))",
                  color: "#fff",
                }}
              >
                {printing ? "Processing..." : "Pay $14.99 & Print"}
              </button>

              <p className="text-[0.6rem] text-white/40 text-center">
                Flat rate includes printing and worldwide shipping.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-[0.65rem] uppercase tracking-widest text-white/40 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
      />
    </div>
  );
}
