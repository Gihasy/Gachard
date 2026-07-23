# Gachard — PRD

## Problem Statement (verbatim)
> I've imported my project from GitHub. I want you to audit the current UI/UX and modernize it. Focus on making the navigation more intuitive, improving the spacing/typography, and applying a consistent [mention your style, e.g., clean/minimal/dark] aesthetic using the Gachard brand colors. Start with the home page.

## Product
Gachard is a next-generation collectible card ecosystem that bridges the physical and digital worlds. Users collect rare cards, play matches, and trade in an open marketplace.

## Stack
- Next.js 16 (App Router, Turbopack) + React 19
- Tailwind CSS v4
- MongoDB (via Next API routes under `/app/api/*`)
- Runs under supervisor as `yarn dev` on port 3000

## Brand Identity (source of truth)
- Colors: Cosmic Violet `#B8ACFF`, Aurora Pink `#FF6BBA`, Electric Blue `#00CCFF`, Aurora Gold `#FFC466`, Deep Navy `#0B0E1A`, Silver Mist `#E6E8F0`
- Fonts: `Unbounded` (display) + `Inter` (body) — loaded via `next/font/google`
- Aesthetic: dark cosmic / premium editorial with vibrant gradient accents

## User Personas
- **Collector** — hunts rare cards, values ownership + rarity signals
- **Player** — competitive, wants clear onboarding + battle stats
- **Trader** — needs an open marketplace, prices, activity feed
- **New Visitor** — needs immediate clarity on what Gachard is + a compelling CTA

## What's been implemented — 2026-01-23

### Home page modernization (session 1)
- **Global**: cosmic backdrop (radial nebula + star drift + noise overlay), fresh brand tokens in `globals.css`, custom scrollbar, selection color, gradient hr, glass utility, three button variants (primary/ghost/gold), reveal + floaty animations, `prefers-reduced-motion` support.
- **Layout** (`app/layout.tsx`): loads Unbounded + Inter as CSS variables, injects `cosmic-bg` and new `<Footer />`, PWA metadata updated with brand tagline. Service worker registration is now gated to `NODE_ENV === 'production'` to avoid dev-mode cache issues.
- **Navbar** (`components/Navbar.tsx`): sticky glass bar with backdrop-blur, brand logo mark + wordmark, six re-labelled links (Home / Collection / Scan / Marketplace / Top Up / Profile), gradient active-underline, user chip when signed-in, animated hamburger + slide-down drawer on mobile, scroll-based opacity.
- **Home** (`app/page.tsx`): Hero (Season chip + gradient-stacked headline + stats + fanned card visual), Featured Cards grid, Why Gachard (4 feature tiles), How It Works (5 steps), CTA band, Footer.

### Design system applied to remaining pages (session 2)
- **New shared `PageShell`** (`components/PageShell.tsx`) — reusable eyebrow + gradient title + description + actions + body container that every page now uses.
- **`/login`** — glass card with glowing logo tile, ENTER THE UNIVERSE gradient headline, "Continue with Google" white button, "Explore as guest" ghost, terms/privacy footer. Now reads `?next=<path>` from the URL and returns the user there after login.
- **`/koleksi`** — MY COLLECTION headline with "Buy a Pack" action. Rarity filter tabs with per-tier counts. 8-tile skeleton loader (times out after 6s) → empty state OR card grid with `CardItem` (also refreshed).
- **`/marketplace`** — "Launching Season 1 — Coming Soon" gradient banner with 3 feature rows (Verified rarity / Atomic escrow / Global liquidity), 6-card sneak-peek grid pulling from the local card artwork set.
- **`/scan`** — landing view shows 2-panel (HOW TO SCAN steps + MANUAL Token ID form). Result view (with `?tokenId=`) shows the card artwork, verification banner, metadata block, and transaction history in rarity-tinted glass panels.
- **`/topup`** — TOP UP CREDIT gradient title, balance card, 4 preset cards (500 / 1000-POPULAR / 2000 / 5000 with +bonuses in gold), main CTA reflects selection, info panel (what credits do + payment note + collection link).
- **`/profil`** — PROFILE title with Top Up + Log Out actions. Left: gradient avatar + username chip + credit balance + Quick Actions grid. Right: 6 stat blocks + Season 1 progress bar + empty-state CTA when 0 cards.
- **`CardItem`** (`components/CardItem.tsx`) — rebuilt with rarity glow variants, tier chips, status pills (Digital / Vaulted), Print + QR actions.

### Auth guard (session 2)
- Client-side useEffect redirects proved unreliable across Next.js 16 dev bundles.
- Fix: **Next.js proxy** (`frontend/proxy.ts`, formerly middleware.ts) enforces the auth guard at the edge. A `gachard_uid` cookie is set on Google login and cleared on logout; any request to `/koleksi`, `/profil`, or `/topup` without it returns 307 → `/login?next=<encoded-path>`.
- Verified via curl AND `page.request.fetch(max_redirects=0)`: 307 with the correct location header.

### Testing
- iteration_1: home page — 100% pass.
- iteration_2: 6 pages — surfaced the client-redirect regression, now fixed.
- iteration_3: middleware auth + design consistency — **100% pass** (all 6 spec bullets).

## Backlog (Next Action Items)
### P0 — not started
- (none)

### P1 — data & real integrations
- Wire the Featured Cards row (home page) + Marketplace preview to real MongoDB data (`/api/cards/featured`, `/api/marketplace/preview`).
- Real Google OAuth (currently mocked via `googleLogin` in `lib/api.ts`) — see integration playbook.
- Real Stripe / credit purchase flow on `/topup` (currently uses the mock `/api/credits/topup` endpoint).
- Real card scan verification pipeline on `/scan` (works today when backend + MongoDB are seeded).

### P2 — polish / enhancements
- Split large pages (`app/page.tsx`, `app/scan/page.tsx`) into per-section components under `/components/*` for maintainability.
- Bundle the Gachard logo mark as a local SVG (removes external CDN dependency).
- Add scroll-triggered reveal animations via IntersectionObserver instead of CSS-only delays.
- Add Lighthouse pass + font subsetting for LCP.
- Add a global toast provider for topup / login success messages (currently inlined).

## Notes
- Supervisor `frontend` program runs `yarn dev` (updated from `yarn start`) so hot reload works in the preview.
- Auth guard is enforced at the edge via `frontend/proxy.ts` (Next.js 16 "proxy" convention — formerly `middleware.ts`). Cookie name: `gachard_uid`.
- Service worker registration is gated to production (`NODE_ENV === 'production'`) so it doesn't cache dev-mode error pages.
