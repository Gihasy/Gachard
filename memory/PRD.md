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
### Home page modernization (this session)
- **Global**: cosmic backdrop (radial nebula + star drift + noise overlay), fresh brand tokens in `globals.css`, custom scrollbar, selection color, gradient hr, glass utility, three button variants (primary/ghost/gold), reveal + floaty animations, `prefers-reduced-motion` support.
- **Layout** (`app/layout.tsx`): loads Unbounded + Inter as CSS variables, injects `cosmic-bg` and new `<Footer />`, PWA metadata updated with brand tagline.
- **Navbar** (`components/Navbar.tsx`): sticky glass bar with backdrop-blur, brand logo mark + wordmark, six re-labelled links (Home / Collection / Scan / Marketplace / Top Up / Profile), gradient active-underline, user chip when signed-in, animated hamburger + slide-down drawer on mobile, scroll-based opacity.
- **Home** (`app/page.tsx`):
  1. **Hero** — Season chip, vertical gradient-stacked headline (COLLECT./PLAY./TRADE.), tagline, description, dual CTAs, stats row (12K+/45K+/3.2K+/50+), animated fanned card stack with 3 layered rarity cards, orbit ring + pulse glow.
  2. **Featured Cards** — 4 rarity tiles with tier chips, hover lift, ATK/DEF/HP stats.
  3. **Why Gachard** — 4 feature cards with per-tile colored icons (violet shield, pink swap, blue market bag, gold community).
  4. **How It Works** — 5 numbered steps with gradient step counters and connector arrows on desktop.
  5. **CTA band** — gradient panel with "Open First Pack" (gold) + "Explore Market" (ghost).
- **Footer** (`components/Footer.tsx`): brand block, 3 link columns (Product/Company/Resources), newsletter subscribe (form-styled pill), copyright + 4 social icons (Discord, X, Instagram, YouTube).
- **Config** (`next.config.ts`): allow-listed the `customer-assets` remote pattern for `next/image` (brand logo mark).

### Testing
- Frontend E2E test suite passed 100% (see `/app/test_reports/iteration_1.json`).
- Verified: navbar behavior + mobile drawer, hero + all sections rendered, CTAs correctly route logged-out visitors to `/login`, no console errors.

## Backlog (Next Action Items)
### P0 — not started
- (none blocking home page delivery)

### P1 — apply the same brand system to remaining pages
- `/koleksi` (Collection) — apply card grid with rarity glow + filters
- `/marketplace` — list view + filters + trade card component
- `/scan` — QR scan flow with brand-consistent framing
- `/topup` — credit purchase flow
- `/profil` — user dashboard w/ balance + collection stats
- `/login` — align auth screen with brand

### P2 — polish / enhancements
- Split `app/page.tsx` (~600 lines) into per-section components under `/components/home/*` for maintainability
- Bundle the Gachard logo mark as a local SVG (avoid external asset dependency)
- Add real card data from MongoDB into the Featured Cards row (currently static demo data)
- Add scroll-triggered reveal animations via IntersectionObserver instead of CSS-only delays
- Add Lighthouse pass + font subsetting for LCP

## Notes
- Supervisor `frontend` program was updated from `yarn start` → `yarn dev` so hot reload works in the preview environment.
- Home page renders fully without authentication; `/api/credits` is only called for signed-in users.
