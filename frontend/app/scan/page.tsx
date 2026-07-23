"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const RARITY_COLORS = ["text-gray-600", "text-blue-600", "text-purple-600", "text-yellow-600"];
const RARITY_BG = ["bg-gray-50", "bg-blue-50", "bg-purple-50", "bg-yellow-50"];
const STATUS_COLORS: Record<string, string> = { Digital: "bg-green-100 text-green-700", Vaulted: "bg-red-100 text-red-700" };

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
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[data.onChain.status] || "bg-gray-100"}`}>
            {data.onChain.status}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Last Owner</span>
          <span className="font-mono text-xs">{data.onChain.lastOwner?.slice(0, 6)}...{data.onChain.lastOwner?.slice(-4)}</span>
        </div>
        {data.purchasePrice !== null && (
          <div className="flex justify-between">
            <span className="text-gray-500">Purchase Price</span>
            <span className="font-medium">{data.purchasePrice} Credit</span>
          </div>
        )}
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
