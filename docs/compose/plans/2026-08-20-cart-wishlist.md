# Cart & Wishlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cart (multi-item checkout) and wishlist (save favorites) to the Trade page.

**Architecture:** Both cart and wishlist use localStorage for persistence (no backend storage needed). Cart processes items sequentially via existing `/api/marketplace/listings/[id]/buy` endpoint. Wishlist is purely client-side. UI adds icon buttons on each listing card + dedicated modals.

**Tech Stack:** React useState + localStorage, existing buy API endpoint, Tailwind CSS.

## Global Constraints

- Cart and wishlist data stored in localStorage (key: `gachard_cart`, `gachard_wishlist`)
- Cart items are listing IDs (not full objects) — fetch fresh data on render
- Cart checkout processes items sequentially (not atomic batch) — if one fails, stop and report
- Wishlist has no backend dependency — purely client-side
- Non-logged-in users can add to cart/wishlist but must login to checkout
- Cart badge shows item count on Trade page header
- Heart icon toggles wishlist state per card
- Cart icon toggles cart state per card
- All UI uses existing glass/btn-primary patterns

---

### Task 1: Wishlist Library + Hook

**Covers:** Wishlist data management

**Files:**
- Create: `frontend/lib/wishlist.ts`
- Create: `frontend/hooks/useWishlist.ts`

**Interfaces:**
- Produces: `getWishlist()`, `toggleWishlist(cardId)`, `isInWishlist(cardId)`, `useWishlist()` hook

- [ ] **Step 1: Create wishlist library**

```typescript
// frontend/lib/wishlist.ts
const STORAGE_KEY = "gachard_wishlist";

export function getWishlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function toggleWishlist(cardId: string): string[] {
  const list = getWishlist();
  const index = list.indexOf(cardId);
  if (index >= 0) {
    list.splice(index, 1);
  } else {
    list.push(cardId);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}

export function isInWishlist(cardId: string): boolean {
  return getWishlist().includes(cardId);
}
```

- [ ] **Step 2: Create useWishlist hook**

```typescript
// frontend/hooks/useWishlist.ts
"use client";
import { useState, useEffect, useCallback } from "react";
import { getWishlist, toggleWishlist as toggle } from "@/lib/wishlist";

export function useWishlist() {
  const [wishlist, setWishlist] = useState<string[]>([]);

  useEffect(() => {
    setWishlist(getWishlist());
  }, []);

  const toggleWishlist = useCallback((cardId: string) => {
    const updated = toggle(cardId);
    setWishlist([...updated]);
  }, []);

  const isWishlisted = useCallback((cardId: string) => {
    return wishlist.includes(cardId);
  }, [wishlist]);

  return { wishlist, toggleWishlist, isWishlisted, count: wishlist.length };
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/wishlist.ts frontend/hooks/useWishlist.ts
git commit -m "feat: wishlist library and useWishlist hook"
```

---

### Task 2: Cart Library + Hook

**Covers:** Cart data management

**Files:**
- Create: `frontend/lib/cart.ts`
- Create: `frontend/hooks/useCart.ts`

**Interfaces:**
- Produces: `getCart()`, `addToCart(listingId)`, `removeFromCart(listingId)`, `clearCart()`, `isInCart(listingId)`, `useCart()` hook

- [ ] **Step 1: Create cart library**

```typescript
// frontend/lib/cart.ts
const STORAGE_KEY = "gachard_cart";

export function getCart(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addToCart(listingId: string): string[] {
  const cart = getCart();
  if (!cart.includes(listingId)) {
    cart.push(listingId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }
  return cart;
}

export function removeFromCart(listingId: string): string[] {
  let cart = getCart();
  cart = cart.filter((id) => id !== listingId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  return cart;
}

export function clearCart(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isInCart(listingId: string): boolean {
  return getCart().includes(listingId);
}
```

- [ ] **Step 2: Create useCart hook**

```typescript
// frontend/hooks/useCart.ts
"use client";
import { useState, useEffect, useCallback } from "react";
import { getCart, addToCart as add, removeFromCart as remove, clearCart as clear } from "@/lib/cart";

export function useCart() {
  const [cart, setCart] = useState<string[]>([]);

  useEffect(() => {
    setCart(getCart());
  }, []);

  const addToCart = useCallback((listingId: string) => {
    const updated = add(listingId);
    setCart([...updated]);
  }, []);

  const removeFromCart = useCallback((listingId: string) => {
    const updated = remove(listingId);
    setCart([...updated]);
  }, []);

  const clearCart = useCallback(() => {
    clear();
    setCart([]);
  }, []);

  const isInCartFn = useCallback((listingId: string) => {
    return cart.includes(listingId);
  }, [cart]);

  return { cart, addToCart, removeFromCart, clearCart, isInCart: isInCartFn, count: cart.length };
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/cart.ts frontend/hooks/useCart.ts
git commit -m "feat: cart library and useCart hook"
```

---

### Task 3: Cart + Wishlist Icons on Trade Page Listings

**Covers:** UI — icon buttons on listing cards

**Files:**
- Modify: `frontend/app/trade/page.tsx`

**Interfaces:**
- Consumes: `useWishlist()`, `useCart()` hooks
- Produces: Heart icon + Cart icon on each listing card

- [ ] **Step 1: Import hooks and add to Trade page**

Add imports at top of `frontend/app/trade/page.tsx`:
```typescript
import { useWishlist } from "@/hooks/useWishlist";
import { useCart } from "@/hooks/useCart";
```

Inside the component function, add:
```typescript
const { toggleWishlist, isWishlisted } = useWishlist();
const { addToCart, isInCart: isInCartFn } = useCart();
```

- [ ] **Step 2: Add icon buttons to listing cards**

After the Buy button in each listing card, add cart and wishlist icons:

```tsx
<div className="mt-auto flex items-center justify-between">
  <span className="text-base font-bold" style={{ color: "var(--aurora-gold)" }}>
    {listing.price} Credit
  </span>
  <div className="flex items-center gap-1.5">
    {/* Wishlist heart */}
    <button
      onClick={(e) => {
        e.stopPropagation();
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
    </button>

    {/* Cart */}
    <button
      onClick={(e) => {
        e.stopPropagation();
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

    {/* Buy */}
    {(!user || listing.sellerId !== user.user_id) && (
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
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/trade/page.tsx
git commit -m "feat: add cart and wishlist icon buttons to Trade page listings"
```

---

### Task 4: Cart Modal — View + Remove + Checkout

**Covers:** Cart UI — modal with item list, remove, checkout

**Files:**
- Create: `frontend/components/CartModal.tsx`
- Modify: `frontend/app/trade/page.tsx` — add cart badge + modal trigger

**Interfaces:**
- Consumes: `useCart()` hook, listing data from API, existing `handleBuy()` function
- Produces: Cart modal with item list, remove buttons, total price, checkout button

- [ ] **Step 1: Create CartModal component**

```tsx
// frontend/components/CartModal.tsx
"use client";
import { useState, useEffect } from "react";

interface CartListing {
  listingId: string;
  cardId: string;
  templateId: string;
  templateName: string;
  artworkUrl: string | null;
  rarity: number;
  price: number;
  sellerId: string;
}

interface CartModalProps {
  cartIds: string[];
  userId: string | null;
  onClose: () => void;
  onRemove: (listingId: string) => void;
  onClear: () => void;
  onCheckoutComplete: () => void;
}

const RARITY_NAMES = ["Common", "Rare", "Epic", "Legendary"];
const RARITY_COLORS: Record<number, string> = {
  0: "#9CA3AF",
  1: "var(--electric-blue)",
  2: "var(--cosmic-violet)",
  3: "var(--aurora-gold)",
};

export default function CartModal({ cartIds, userId, onClose, onRemove, onClear, onCheckoutComplete }: CartModalProps) {
  const [items, setItems] = useState<CartListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [results, setResults] = useState<{ listingId: string; success: boolean; error?: string }[]>([]);

  useEffect(() => {
    if (cartIds.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch("/api/marketplace/listings")
      .then((r) => r.json())
      .then((data) => {
        const allListings = data.listings || [];
        const cartItems = cartIds
          .map((id) => allListings.find((l: CartListing) => l.listingId === id))
          .filter(Boolean) as CartListing[];
        setItems(cartItems);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [cartIds]);

  const totalPrice = items.reduce((sum, item) => sum + item.price, 0);

  async function handleCheckout() {
    if (!userId) return;
    setCheckingOut(true);
    const checkoutResults: { listingId: string; success: boolean; error?: string }[] = [];

    for (const item of items) {
      try {
        const res = await fetch(`/api/marketplace/listings/${item.listingId}/buy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        const data = await res.json();
        if (res.ok) {
          checkoutResults.push({ listingId: item.listingId, success: true });
        } else {
          checkoutResults.push({ listingId: item.listingId, success: false, error: data.error });
          break; // Stop on first failure
        }
      } catch {
        checkoutResults.push({ listingId: item.listingId, success: false, error: "Network error" });
        break;
      }
    }

    setResults(checkoutResults);
    setCheckingOut(false);

    // Remove successfully purchased items from cart
    const purchasedIds = checkoutResults.filter((r) => r.success).map((r) => r.listingId);
    purchasedIds.forEach((id) => onRemove(id));
    if (purchasedIds.length === items.length) {
      onClear();
    }
    onCheckoutComplete();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: "rgba(15, 19, 36, 0.95)",
          border: "1px solid rgba(0,204,255,0.3)",
          boxShadow: "0 0 40px rgba(0,0,0,0.5), 0 0 20px rgba(0,204,255,0.1)",
          maxHeight: "80vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
          <h3 className="text-base font-semibold" style={{ color: "var(--silver-mist)" }}>
            Cart ({items.length})
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-8 text-center text-white/50 text-sm">Loading...</div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-white/50 text-sm">Cart is empty</div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                const result = results.find((r) => r.listingId === item.listingId);
                return (
                  <div
                    key={item.listingId}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{
                      background: result?.success ? "rgba(0,255,136,0.08)" : result?.error ? "rgba(255,107,186,0.08)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${result?.success ? "rgba(0,255,136,0.2)" : result?.error ? "rgba(255,107,186,0.2)" : "rgba(255,255,255,0.06)"}`,
                    }}
                  >
                    {item.artworkUrl ? (
                      <img src={item.artworkUrl} alt={item.templateName} className="w-10 h-14 object-contain rounded" />
                    ) : (
                      <div className="w-10 h-14 bg-white/5 rounded flex items-center justify-center text-[10px] text-white/30">?</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--silver-mist)" }}>{item.templateName}</p>
                      <p className="text-[10px]" style={{ color: RARITY_COLORS[item.rarity] }}>{RARITY_NAMES[item.rarity]}</p>
                    </div>
                    <span className="text-sm font-semibold shrink-0" style={{ color: "var(--aurora-gold)" }}>{item.price}</span>
                    {!result && (
                      <button
                        onClick={() => onRemove(item.listingId)}
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    )}
                    {result?.success && <span className="text-[10px] text-green-400 shrink-0">Purchased</span>}
                    {result?.error && <span className="text-[10px] text-red-400 shrink-0">{result.error}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-5 border-t border-white/10 shrink-0">
            <div className="flex justify-between mb-4">
              <span className="text-sm" style={{ color: "var(--silver-mist-dim)" }}>Total</span>
              <span className="text-lg font-bold" style={{ color: "var(--aurora-gold)" }}>{totalPrice} Credit</span>
            </div>
            {results.length > 0 ? (
              <button onClick={onClose} className="btn-primary w-full">Done</button>
            ) : (
              <button
                onClick={handleCheckout}
                disabled={checkingOut || !userId}
                className="btn-primary w-full disabled:opacity-50"
              >
                {checkingOut ? "Processing..." : !userId ? "Login to Checkout" : `Checkout (${items.length} items)`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add cart badge + modal trigger to Trade page**

In `frontend/app/trade/page.tsx`, add state and UI:

```typescript
import CartModal from "@/components/CartModal";
```

Add state:
```typescript
const [showCart, setShowCart] = useState(false);
```

Add cart badge button near the page title (in the `actions` prop of PageShell or near the filter buttons):
```tsx
<button
  onClick={() => setShowCart(true)}
  className="relative w-10 h-10 rounded-full flex items-center justify-center"
  style={{ background: "rgba(0,204,255,0.08)", border: "1px solid rgba(0,204,255,0.25)" }}
>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--electric-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
  {cart.count > 0 && (
    <span
      className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
      style={{ background: "var(--aurora-pink)", color: "white" }}
    >
      {cart.count}
    </span>
  )}
</button>
```

Add CartModal render:
```tsx
{showCart && (
  <CartModal
    cartIds={cart.cart}
    userId={user?.user_id || null}
    onClose={() => setShowCart(false)}
    onRemove={cart.removeFromCart}
    onClear={cart.clearCart}
    onCheckoutComplete={() => fetchListings()}
  />
)}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/CartModal.tsx frontend/app/trade/page.tsx
git commit -m "feat: cart modal with item list, remove, and sequential checkout"
```

---

### Task 5: Login Prompt for Cart/Wishlist Actions

**Covers:** Non-logged-in user experience

**Files:**
- Modify: `frontend/app/trade/page.tsx`

**Interfaces:**
- Consumes: existing `showLoginPrompt` state
- Produces: Login prompt when non-logged-in user clicks cart/wishlist icons

- [ ] **Step 1: Add login check to cart/wishlist handlers**

Update the icon button onClick handlers:

```tsx
// Wishlist heart
onClick={(e) => {
  e.stopPropagation();
  if (!user) { setShowLoginPrompt(true); return; }
  toggleWishlist(listing.cardId);
}}

// Cart
onClick={(e) => {
  e.stopPropagation();
  if (!user) { setShowLoginPrompt(true); return; }
  addToCart(listing.listingId);
}}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/trade/page.tsx
git commit -m "feat: show login prompt for cart/wishlist actions by non-logged-in users"
```

---

### Task 6: Wishlist Page

**Covers:** Wishlist view page

**Files:**
- Create: `frontend/app/wishlist/page.tsx`

**Interfaces:**
- Consumes: `useWishlist()` hook, listing data from API
- Produces: Wishlist page showing saved cards with remove + buy buttons

- [ ] **Step 1: Create wishlist page**

```tsx
// frontend/app/wishlist/page.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { useWishlist } from "@/hooks/useWishlist";

interface WishlistListing {
  listingId: string;
  cardId: string;
  templateName: string;
  artworkUrl: string | null;
  rarity: number;
  price: number;
  fvm: number | null;
}

const RARITY_NAMES = ["Common", "Rare", "Epic", "Legendary"];
const RARITY_COLORS: Record<number, string> = {
  0: "#9CA3AF", 1: "var(--electric-blue)", 2: "var(--cosmic-violet)", 3: "var(--aurora-gold)",
};

export default function WishlistPage() {
  const { wishlist, toggleWishlist } = useWishlist();
  const [items, setItems] = useState<WishlistListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wishlist.length === 0) { setItems([]); setLoading(false); return; }
    setLoading(true);
    fetch("/api/marketplace/listings")
      .then((r) => r.json())
      .then((data) => {
        const all = data.listings || [];
        const matched = wishlist
          .map((cardId) => all.find((l: WishlistListing & { cardId: string }) => l.cardId === cardId))
          .filter(Boolean) as WishlistListing[];
        setItems(matched);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [wishlist]);

  return (
    <PageShell title="Wishlist" description="Cards you've saved for later.">
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="glass animate-pulse h-64 rounded-2xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="glass p-8 sm:p-12 text-center">
          <p className="text-lg font-semibold mb-2" style={{ color: "var(--silver-mist)" }}>No wishlisted cards</p>
          <p className="text-sm mb-4" style={{ color: "var(--silver-mist-dim)" }}>Browse the marketplace and save your favorites.</p>
          <Link href="/trade" className="btn-primary inline-block">Go to Trade</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.cardId} className="glass glass-hover p-3 flex flex-col">
              {item.artworkUrl ? (
                <img src={item.artworkUrl} alt={item.templateName} className="w-full aspect-[5/7] object-contain rounded-lg mb-3" />
              ) : (
                <div className="w-full aspect-[5/7] bg-white/5 rounded-lg flex items-center justify-center text-xs text-white/30 mb-3">?</div>
              )}
              <p className="text-sm font-semibold truncate" style={{ color: "var(--silver-mist)" }}>{item.templateName}</p>
              <p className="text-[10px] mb-1" style={{ color: RARITY_COLORS[item.rarity] }}>{RARITY_NAMES[item.rarity]}</p>
              {item.fvm !== null && <p className="text-[11px] mb-2" style={{ color: "var(--silver-mist-dim)" }}>FVM: <span style={{ color: "var(--aurora-gold)" }}>{item.fvm} Credit</span></p>}
              <div className="mt-auto flex items-center justify-between">
                <span className="text-base font-bold" style={{ color: "var(--aurora-gold)" }}>{item.price} Credit</span>
                <button onClick={() => toggleWishlist(item.cardId)} className="text-xs text-white/50 hover:text-white">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
```

- [ ] **Step 2: Add Wishlist link to Navbar/Footer**

In `frontend/components/Footer.tsx`, add to productLinks:
```typescript
{ label: "Wishlist", href: "/wishlist" },
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/wishlist/page.tsx frontend/components/Footer.tsx
git commit -m "feat: wishlist page with saved cards display"
```

---

## Spec Coverage

| Requirement | Task |
|-------------|------|
| Wishlist data (localStorage) | Task 1 |
| Cart data (localStorage) | Task 2 |
| Heart icon on listings | Task 3 |
| Cart icon on listings | Task 3 |
| Cart modal (view/remove/checkout) | Task 4 |
| Login prompt for non-logged-in | Task 5 |
| Wishlist page | Task 6 |
| Cart badge count | Task 4 |
| Sequential checkout | Task 4 |
| Navbar/Footer links | Task 6 |

**Total: 6 tasks, all requirements covered.**
