"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const RARITY_COLORS = ["var(--rarity-common)", "var(--rarity-rare)", "var(--rarity-epic)", "var(--rarity-legendary)"];
const RARITY_GLOW = ["", "glow-rare", "glow-epic", "glow-legendary"];
const RARITY_LABELS = ["Common", "Rare", "Epic", "Legendary"];

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
        <h1 className="text-4xl font-bold mb-4 uppercase" style={{ color: "var(--text-primary)" }}>Scan Kartu</h1>
        <p style={{ color: "var(--silver-mist)" }}>Scan QR code pada kartu fisik, atau masukkan Token ID.</p>
        <ManualInput />
      </div>
    );
  }

  if (loading) return <p className="text-center mt-20" style={{ color: "var(--silver-mist)" }}>Scanning...</p>;
  if (error) return <p className="text-center mt-20" style={{ color: "var(--aurora-pink)" }}>{error}</p>;
  if (!data) return null;

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center uppercase" style={{ color: "var(--text-primary)" }}>
        Scan Result
      </h1>

      {/* Card Image */}
      <div
        className={`card-surface overflow-hidden mb-6 ${RARITY_GLOW[data.onChain.rarityCode]}`}
        style={{ borderColor: RARITY_COLORS[data.onChain.rarityCode] }}
      >
        {data.metadata.artworkUrl ? (
          <img src={data.metadata.artworkUrl} alt={data.metadata.templateName} className="w-full h-64 object-cover" />
        ) : (
          <div className="w-full h-64 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
            <span className="text-6xl">🎴</span>
          </div>
        )}
      </div>

      {/* Verification Flag */}
      <div
        className="text-center mb-4 p-2 rounded-lg"
        style={{
          background: data.verification.flag === "verified" ? "rgba(0,204,255,0.1)" : "rgba(255,196,102,0.1)",
          color: data.verification.flag === "verified" ? "var(--electric-blue)" : "var(--aurora-gold)",
        }}
      >
        <span className="text-lg">{data.verification.flag === "verified" ? "✅" : "⚠️"}</span>
        <span className="ml-2 text-sm font-medium">
          {data.verification.flag === "verified" ? "Verified" : "Warning — data mismatch"}
        </span>
      </div>

      {/* Metadata */}
      <div className="card-surface p-4 space-y-3">
        <div className="flex justify-between">
          <span style={{ color: "var(--silver-mist)" }}>Token ID</span>
          <span className="font-mono font-bold" style={{ color: "var(--text-primary)" }}>#{data.tokenId}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: "var(--silver-mist)" }}>Name</span>
          <span className="font-medium" style={{ color: "var(--text-primary)" }}>{data.metadata.templateName || "Unknown"}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: "var(--silver-mist)" }}>Rarity</span>
          <span className={`tag tag-${RARITY_LABELS[data.onChain.rarityCode].toLowerCase()}`}>
            {data.onChain.rarity}
          </span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: "var(--silver-mist)" }}>Status</span>
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{
              background: data.onChain.status === "Vaulted" ? "rgba(255,107,186,0.15)" : "rgba(0,204,255,0.15)",
              color: data.onChain.status === "Vaulted" ? "var(--aurora-pink)" : "var(--electric-blue)",
            }}
          >
            {data.onChain.status}
          </span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: "var(--silver-mist)" }}>Last Owner</span>
          <span className="font-mono text-xs" style={{ color: "var(--silver-mist)" }}>
            {data.onChain.lastOwner?.slice(0, 6)}...{data.onChain.lastOwner?.slice(-4)}
          </span>
        </div>
        {data.purchasePrice !== null && (
          <div className="flex justify-between">
            <span style={{ color: "var(--silver-mist)" }}>Purchase Price</span>
            <span className="font-medium" style={{ color: "var(--aurora-gold)" }}>{data.purchasePrice} Credit</span>
          </div>
        )}
      </div>

      {/* History */}
      {data.history.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold mb-3 uppercase" style={{ color: "var(--text-primary)" }}>History</h2>
          <div className="space-y-2">
            {data.history.map((tx: any, i: number) => (
              <div key={i} className="card-surface p-3 flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium capitalize" style={{ color: "var(--text-primary)" }}>{tx.type}</span>
                  <span
                    className="ml-2 text-xs px-2 py-0.5 rounded"
                    style={{
                      background: tx.status === "confirmed" ? "rgba(0,204,255,0.15)" : "rgba(255,196,102,0.15)",
                      color: tx.status === "confirmed" ? "var(--electric-blue)" : "var(--aurora-gold)",
                    }}
                  >
                    {tx.status}
                  </span>
                </div>
                <span className="text-xs" style={{ color: "var(--silver-mist)" }}>{new Date(tx.timestamp).toLocaleDateString()}</span>
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
          className="flex-1 px-4 py-2 rounded-lg"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-primary)" }}
        />
        <a href={`/scan?tokenId=${input}`} className="btn-cta px-4 py-2 text-sm">
          Scan
        </a>
      </div>
    </div>
  );
}

export default function Scan() {
  return (
    <Suspense fallback={<p className="text-center mt-20" style={{ color: "var(--silver-mist)" }}>Loading...</p>}>
      <ScanContent />
    </Suspense>
  );
}
