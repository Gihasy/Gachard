"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageShell from "@/components/PageShell";

interface Listing {
  listingId: string;
  cardId: string;
  tokenId: number;
  templateId: string;
  sellerId: string;
  price: number;
  status: string;
  artworkUrl: string | null;
  templateName: string;
  rarity: number;
  fvm: number | null;
  fvmSource: string;
  createdAt: string;
}

const RARITY_NAMES = ["Common", "Rare", "Epic", "Legendary"];
const RARITY_COLORS: Record<number, string> = {
  0: "#9CA3AF",
  1: "var(--electric-blue)",
  2: "var(--cosmic-violet)",
  3: "var(--aurora-gold)",
};

export default function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [filter, setFilter] = useState<number | null>(null);
  const [user, setUser] = useState<{ user_id: string; username: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    fetchListings();
    fetchInsight();
  }, []);

  async function fetchListings() {
    setLoading(true);
    try {
      const res = await fetch("/api/marketplace/listings");
      const data = await res.json();
      setListings(data.listings || []);
    } catch {
      setListings([]);
    }
    setLoading(false);
  }

  async function fetchInsight() {
    try {
      const res = await fetch("/api/marketplace/insight");
      const data = await res.json();
      setInsight(data.insight || null);
    } catch {
      setInsight(null);
    }
  }

  async function handleBuy(listingId: string) {
    if (!user) return;
    setBuying(listingId);
    try {
      const res = await fetch(`/api/marketplace/listings/${listingId}/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.user_id }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchListings();
        alert("Purchase successful!");
      } else {
        alert(data.error || "Purchase failed");
      }
    } catch {
      alert("Network error");
    }
    setBuying(null);
  }

  const filtered = filter !== null
    ? listings.filter((l) => l.rarity === filter)
    : listings;

  return (
    <PageShell
      eyebrow="Marketplace"
      title="Trade Cards"
      description="Buy and sell digital cards with other collectors."
    >
      {insight && (
        <div className="glass p-4 sm:p-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--aurora-gold)" }}>
              Market Insight
            </span>
          </div>
          <p className="text-sm" style={{ color: "var(--silver-mist)" }}>
            {insight}
          </p>
        </div>
      )}

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            filter === null ? "btn-primary !py-1.5 !px-3 !text-xs" : "btn-ghost !py-1.5 !px-3 !text-xs"
          }`}
        >
          All
        </button>
        {[0, 1, 2, 3].map((r) => (
          <button
            key={r}
            onClick={() => setFilter(filter === r ? null : r)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === r ? "btn-primary !py-1.5 !px-3 !text-xs" : "btn-ghost !py-1.5 !px-3 !text-xs"
            }`}
          >
            {RARITY_NAMES[r]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass animate-pulse h-64 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass p-8 sm:p-12 text-center">
          <p className="text-lg font-semibold mb-2" style={{ color: "var(--silver-mist)" }}>
            No listings yet
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--silver-mist-dim)" }}>
            Be the first to list a card for trade!
          </p>
          <Link href="/collection" className="btn-primary inline-block">
            Go to Collection
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((listing) => (
            <div key={listing.listingId} className="glass glass-hover p-3 flex flex-col">
              <div className="relative mb-3">
                {listing.artworkUrl ? (
                  <img
                    src={listing.artworkUrl}
                    alt={listing.templateName}
                    className="w-full aspect-[5/7] object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-full aspect-[5/7] bg-white/5 rounded-lg flex items-center justify-center text-xs" style={{ color: "var(--silver-mist-dim)" }}>
                    No artwork
                  </div>
                )}
                <span
                  className="absolute top-2 right-2 tag-common text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${RARITY_COLORS[listing.rarity]}20`,
                    color: RARITY_COLORS[listing.rarity],
                    borderColor: `${RARITY_COLORS[listing.rarity]}40`,
                  }}
                >
                  {RARITY_NAMES[listing.rarity]}
                </span>
              </div>

              <p className="text-sm font-semibold truncate" style={{ color: "var(--silver-mist)" }}>
                {listing.templateName}
              </p>
              <p className="text-xs mb-1" style={{ color: "var(--silver-mist-dim)" }}>
                #{listing.cardId}
              </p>

              {listing.fvm !== null && (
                <p className="text-[11px] mb-2" style={{ color: "var(--silver-mist-dim)" }}>
                  FVM: <span style={{ color: "var(--aurora-gold)" }}>{listing.fvm} Credit</span>
                </p>
              )}

              <div className="mt-auto flex items-center justify-between">
                <span className="text-base font-bold" style={{ color: "var(--aurora-gold)" }}>
                  {listing.price} Credit
                </span>
                {user && listing.sellerId !== user.user_id && (
                  <button
                    onClick={() => handleBuy(listing.listingId)}
                    disabled={buying === listing.listingId}
                    className="btn-primary !py-1 !px-3 !text-xs"
                  >
                    {buying === listing.listingId ? "..." : "Buy"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
