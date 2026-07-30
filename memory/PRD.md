# Gachard — PRD / Working Notes

## Original Problem Statement (this session)
Buat tampilan https://www.gachard.com/profile menyesuaikan ukuran iPhone 12 Pro (390x844) dan Samsung Galaxy S8+ (360x740) — serta semua dimensi responsive standar di F12 — dengan commit terbaru di repo Gachard. Masalah utama: elemen terpotong. Login via demo account (tanpa Google).

## Stack
- Next.js 16 (App Router) frontend on port 3000; FastAPI reverse-proxy on 8001 (forwards /api/* → :3000).
- MongoDB (local). Supervisor runs `next start` (PRODUCTION build) → must `yarn build` after code changes, then `supervisorctl restart frontend`.
- Demo login: `/login` → "Demo Account" button (ENABLE_DEMO_LOGIN=true). Creates @DemoN user with 10k credits.

## Work done (June 2026 — responsive profile)
- Verified `/profile` layout across 320/360/375/390/414/540/768/820px: NO horizontal overflow at any width.
- Fixed real cutoff: collection card meta row used `justify-between` (no wrap) → long status badge "IN PROGRESS" was clipped by card's overflow-hidden at 360px 2-col grid. Changed to `flex flex-wrap justify-between gap-1` so badge wraps below the rarity tag instead of clipping.
- Fixed data mismatch on profile cards: `/api/cards` returns `displayStatus`, but page read non-existent `status`/`fulfillmentStatus`. Result was an empty status pill and wrong stats (all counted "Digital"). Updated Card type + stats + badge to use `displayStatus` ("Digital"/"In Progress"/"Real").
- File changed: `frontend/app/profile/page.tsx` only.

## Verification
- Screenshotted iPhone 12 Pro (390) & Galaxy S8+ (360) with empty and 15-card collections (incl. pagination page 2 with all rarities/statuses). All elements fit, badges readable, no cutoff. (Test cards seeded into Demo2 then removed — DB restored.)

## Backlog / Next
- P2: `/api/cards` no longer returns raw `status`; if any other page relies on `status`, align to `displayStatus`.
- P2: Consider truncating/abbreviating very long badge text on ultra-narrow screens instead of wrapping, if design prefers single-line.
- Deploy latest commit so production gachard.com/profile reflects the responsive fixes.
