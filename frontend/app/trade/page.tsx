"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { useWishlist } from "@/hooks/useWishlist";
import { useCart } from "@/hooks/useCart";

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

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "popular", label: "Popular (FVM)" },
];

export default function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [filter, setFilter] = useState<number | null>(null);
  const [sort, setSort] = useState<string>("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [wishlistCounts, setWishlistCounts] = useState<Record<string, number>>({});
  const [user, setUser] = useState<{ user_id: string; username: string } | null>(null);
  const { toggleWishlist, isWishlisted } = useWishlist();
  const { addToCart, isInCart: isInCartFn } = useCart();

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    fetchListings();
    fetchInsight();
  }, []);

  useEffect(() => {
    if (!sortOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [sortOpen]);

  async function fetchListings() {
    setLoading(true);
    try {
      const res = await fetch("/api/marketplace/listings");
      const data = await res.json();
      const listingsData = data.listings || [];
      setListings(listingsData);

      // Fetch wishlist counts for all listings
      if (listingsData.length > 0) {
        const cardIds = listingsData.map((l: Listing) => l.cardId).join(",");
        try {
          const statsRes = await fetch(`/api/marketplace/wishlist-stats?cardIds=${cardIds}`);
          const statsData = await statsRes.json();
          setWishlistCounts(statsData.stats || {});
        } catch {
          setWishlistCounts({});
        }
      }
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
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
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

  const filtered = (filter !== null
    ? listings.filter((l) => l.rarity === filter)
    : listings
  ).sort((a, b) => {
    switch (sort) {
      case "price-high": return b.price - a.price;
      case "price-low": return a.price - b.price;
      case "newest": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "popular": return (wishlistCounts[b.cardId] || 0) - (wishlistCounts[a.cardId] || 0);
      default: return 0;
    }
  });

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

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {/* Rarity filter */}
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

        {/* Sort dropdown */}
        <div ref={sortRef} className="relative ml-auto">
          <button
            onClick={() => setSortOpen((v) => !v)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "var(--silver-mist)",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="14" y2="12" /><line x1="4" y1="18" x2="8" y2="18" />
            </svg>
            {SORT_OPTIONS.find((o) => o.value === sort)?.label || "Sort"}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, transform: sortOpen ? "rotate(180deg)" : "none", transition: "transform 150ms" }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {sortOpen && (
            <div
              className="absolute right-0 mt-1.5 py-1.5 rounded-xl z-40 min-w-[180px]"
              style={{
                background: "rgba(15, 19, 36, 0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(16px)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setSort(opt.value); setSortOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs font-medium transition-colors"
                  style={{
                    color: sort === opt.value ? "var(--aurora-gold)" : "var(--silver-mist)",
                    background: sort === opt.value ? "rgba(255,196,102,0.08)" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (sort !== opt.value) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={(e) => { if (sort !== opt.value) e.currentTarget.style.background = "transparent"; }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
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
              <button
                type="button"
                className="relative mb-3 cursor-pointer group rounded-lg overflow-hidden"
                onClick={() => setSelectedListing(listing)}
                style={{ background: "none", border: "none", padding: 0 }}
              >
                {listing.artworkUrl ? (
                  <img
                    src={listing.artworkUrl}
                    alt={listing.templateName}
                    className="w-full aspect-[5/7] object-contain transition-transform duration-200 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full aspect-[5/7] bg-white/5 flex items-center justify-center text-xs" style={{ color: "var(--silver-mist-dim)" }}>
                    No artwork
                  </div>
                )}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.35)" }}
                >
                  <span className="text-xs font-semibold uppercase tracking-widest text-white">
                    View Info
                  </span>
                </div>
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
              </button>

              <p className="text-sm font-semibold truncate" style={{ color: "var(--silver-mist)" }}>
                {listing.templateName}
              </p>
              <p className="text-xs mb-1" style={{ color: "var(--silver-mist-dim)" }}>
                #{listing.cardId}
              </p>

              {/* QR Code for card scan */}
              <div className="flex items-center gap-2 mb-2 p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                <img
                  src={`/api/cards/${listing.tokenId}/qr`}
                  alt={`QR for #${listing.cardId}`}
                  className="w-10 h-10 rounded"
                  loading="lazy"
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--electric-blue)" }}>
                    Scan for Details
                  </p>
                  <p className="text-[9px]" style={{ color: "var(--silver-mist-dim)" }}>
                    Verify ownership & history
                  </p>
                </div>
              </div>

              {listing.fvm !== null && (
                <p className="text-[11px] mb-2" style={{ color: "var(--silver-mist-dim)" }}>
                  FVM: <span style={{ color: "var(--aurora-gold)" }}>{listing.fvm} Credit</span>
                </p>
              )}

              <div className="mt-auto">
                {/* Price + icons row */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-bold" style={{ color: "var(--aurora-gold)" }}>
                    {listing.price} Credit
                  </span>
                  <div className="flex items-center gap-1.5">
                    {/* Wishlist heart */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!user) { setShowLoginPrompt(true); return; }
                        toggleWishlist(listing.cardId);
                      }}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: isWishlisted(listing.cardId) ? "rgba(255,107,186,0.2)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${isWishlisted(listing.cardId) ? "rgba(255,107,186,0.5)" : "rgba(255,255,255,0.1)"}`,
                      }}
                      title={isWishlisted(listing.cardId) ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={isWishlisted(listing.cardId) ? "#FF6BBA" : "none"} stroke={isWishlisted(listing.cardId) ? "#FF6BBA" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                      {(wishlistCounts[listing.cardId] || 0) > 0 && (
                        <span className="text-[9px] font-bold ml-0.5" style={{ color: "var(--aurora-pink)" }}>
                          {wishlistCounts[listing.cardId]}
                        </span>
                      )}
                    </button>

                    {/* Cart */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!user) { setShowLoginPrompt(true); return; }
                        addToCart(listing.listingId);
                      }}
                      disabled={isInCartFn(listing.listingId)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: isInCartFn(listing.listingId) ? "rgba(0,204,255,0.2)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${isInCartFn(listing.listingId) ? "rgba(0,204,255,0.5)" : "rgba(255,255,255,0.1)"}`,
                        opacity: isInCartFn(listing.listingId) ? 0.5 : 1,
                      }}
                      title={isInCartFn(listing.listingId) ? "Already in cart" : "Add to cart"}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isInCartFn(listing.listingId) ? "var(--electric-blue)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1" />
                        <circle cx="20" cy="21" r="1" />
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Buy button — full width */}
                {(!user || listing.sellerId !== user.user_id) && (
                  <button
                    onClick={() => handleBuy(listing.listingId)}
                    disabled={buying === listing.listingId}
                    className="btn-primary !py-2 !text-xs w-full"
                  >
                    {buying === listing.listingId ? "Processing..." : "Buy Now"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Info Modal */}
      {selectedListing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setSelectedListing(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{
              background: "rgba(15, 19, 36, 0.95)",
              border: "1px solid rgba(255,196,102,0.3)",
              boxShadow: "0 0 40px rgba(0,0,0,0.5), 0 0 20px rgba(255,196,102,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Artwork */}
            <div className="relative" style={{ background: "rgba(0,0,0,0.3)" }}>
              {selectedListing.artworkUrl ? (
                <img
                  src={selectedListing.artworkUrl}
                  alt={selectedListing.templateName}
                  className="w-full max-h-64 object-contain"
                />
              ) : (
                <div className="w-full h-40 flex items-center justify-center text-xs" style={{ color: "var(--silver-mist-dim)" }}>
                  No artwork
                </div>
              )}
              <span
                className="absolute top-3 right-3 tag-common text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${RARITY_COLORS[selectedListing.rarity]}20`,
                  color: RARITY_COLORS[selectedListing.rarity],
                  borderColor: `${RARITY_COLORS[selectedListing.rarity]}40`,
                }}
              >
                {RARITY_NAMES[selectedListing.rarity]}
              </span>
            </div>

            {/* Info */}
            <div className="p-5 space-y-3">
              <h3 className="text-base font-semibold" style={{ color: "var(--silver-mist)" }}>
                {selectedListing.templateName}
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--silver-mist-dim)" }}>Card ID</span>
                  <span className="font-mono" style={{ color: "var(--silver-mist)" }}>#{selectedListing.cardId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--silver-mist-dim)" }}>Rarity</span>
                  <span style={{ color: RARITY_COLORS[selectedListing.rarity] }}>{RARITY_NAMES[selectedListing.rarity]}</span>
                </div>
                {selectedListing.fvm !== null && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "var(--silver-mist-dim)" }}>Fair Value Market</span>
                    <span style={{ color: "var(--aurora-gold)" }}>{selectedListing.fvm} Credit</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold">
                  <span style={{ color: "var(--silver-mist-dim)" }}>Listing Price</span>
                  <span style={{ color: "var(--aurora-gold)" }}>{selectedListing.price} Credit</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSelectedListing(null)}
                  className="btn-ghost flex-1 !py-2.5 !text-xs"
                >
                  Close
                </button>
                <a
                  href={`/scan?cardId=${selectedListing.cardId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex-1 !py-2.5 !text-xs text-center"
                  onClick={() => setSelectedListing(null)}
                >
                  View Details
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowLoginPrompt(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{
              background: "rgba(15, 19, 36, 0.95)",
              border: "1px solid rgba(184,172,255,0.3)",
              boxShadow: "0 0 40px rgba(0,0,0,0.5), 0 0 20px rgba(184,172,255,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold mb-2" style={{ color: "var(--silver-mist)" }}>
              Login Required
            </h3>
            <p className="text-sm mb-5" style={{ color: "var(--silver-mist-dim)" }}>
              You need to login to buy cards on the marketplace.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="btn-ghost flex-1 !py-2.5"
              >
                Cancel
              </button>
              <Link
                href="/login?next=/trade"
                className="btn-primary flex-1 !py-2.5 text-center"
                onClick={() => setShowLoginPrompt(false)}
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
