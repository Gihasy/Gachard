---
feature: support-gachard
status: delivered
specs: []
plans:
  - docs/compose/plans/2026-08-28-support-gachard.md
branch: feat/ai-anomaly-detection-oracle
commits: fa3ed69..2f7d77b
---

# Support Gachard — Final Report

## What Was Built

A floating "Support Gachard" CTA button fixed to the bottom-right corner of every page. Visitors click the button to open a glassmorphism panel where they submit their email and an optional message to register as early supporters. A live supporter count serves as social proof — displayed on the floating button and inside the panel.

The feature includes full backend integration with MongoDB (unique email constraint, insert-then-catch duplicate detection), spam protection (IP-based rate limiting at 10 requests/minute, honeypot field for bot detection, server-side validation), and an admin dashboard tab for viewing all submissions with email, message, and timestamp.

## Architecture

### Component Tree

```
SupportGachard (parent, state orchestrator)
├── SupportFloatingButton (fixed bottom-right, z-45, forwardRef)
└── SupportPanel (overlay, z-50)
    ├── SupportForm (email + message + honeypot)
    └── SupportSuccess (success/duplicate confirmation)
```

### Data Flow

```
User clicks button → SupportGachard.setIsOpen(true)
  → SupportPanel renders (overlay + glass card)
    → SupportForm renders
      → User submits → SupportGachard.handleSubmit()
        → submitSupporter() → POST /api/supporters
          → Server: honeypot check → rate limit → validate → insertOne()
            → Success: { success: true, count }
            → Duplicate (11000): { duplicate: true, count }
          → Client: setCount(), setViewState("success"|"duplicate")
            → SupportSuccess renders

Panel close (X / click outside / Escape / Done)
  → setIsOpen(false) → setTimeout 300ms → reset form state → focus returns to button
```

### API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/supporters/count` | GET | Public | Aggregate count, `Cache-Control: no-store` |
| `/api/supporters` | POST | Public | Submit email + message |
| `/api/admin/supporters` | GET | Basic Auth | List all supporters (admin only) |

### POST `/api/supporters` — Request Pipeline

1. **Honeypot** — if `website` field is filled, return fake 200 success
2. **Email validation** — required, `trim().toLowerCase()`, regex check
3. **Message validation** — `trim()`, max 500 characters
4. **Rate limit** — 10 attempts per minute per IP (`x-forwarded-for` → `x-real-ip` → `"unknown"`)
5. **Insert** — `insertOne({ email, message, createdAt })`
6. **Duplicate catch** — MongoDB error code 11000 → `{ duplicate: true, count }`

### Key Design Decisions

- **Insert-then-catch over check-then-insert**: Avoids race condition where two simultaneous requests with the same email both pass the check. MongoDB unique index guarantees atomicity.
- **Unique index created on connection init** (`lib/mongodb.ts`): Idempotent `createIndex` runs once per serverless cold start. No migration scripts needed.
- **IP rate limiting via MongoDB** (`rate_limits` collection): Reuses existing collection pattern from `rate-limit.ts`. In-memory rate limiting doesn't work on Vercel serverless.
- **Honeypot returns fake success**: Doesn't reveal to bots that they were detected. Uses `position: absolute; left: -9999px` instead of `type="hidden"` (which bots can detect).
- **z-45 for floating button**: Sits below Navbar (z-50) and modals (z-50) to avoid overlap. Panel opens at z-50 (same level as other modals).
- **`countLoaded` state**: Floating button hides the count line entirely until the first fetch completes — no flash of "0 collectors" or layout shift.
- **`forwardRef` on SupportFloatingButton**: Enables focus return to the button after panel closes (accessibility).

## Files

| File | Action | Purpose |
|------|--------|---------|
| `frontend/app/api/supporters/route.ts` | Created | POST endpoint with full validation pipeline |
| `frontend/app/api/supporters/count/route.ts` | Created | GET endpoint for aggregate count |
| `frontend/app/api/admin/supporters/route.ts` | Created | Admin GET endpoint (Basic Auth protected) |
| `frontend/lib/supporters.ts` | Created | Client-side service layer |
| `frontend/lib/mongodb.ts` | Modified | Added unique index creation on connection init |
| `frontend/components/support/SupportGachard.tsx` | Created | Parent state orchestrator |
| `frontend/components/support/SupportFloatingButton.tsx` | Created | Fixed bottom-right CTA button |
| `frontend/components/support/SupportPanel.tsx` | Created | Glass overlay panel with focus trap |
| `frontend/components/support/SupportForm.tsx` | Created | Email + message form with honeypot |
| `frontend/components/support/SupportSuccess.tsx` | Created | Success/duplicate confirmation view |
| `frontend/app/layout.tsx` | Modified | Added `<SupportGachard />` after Footer |
| `frontend/app/api/admin/clean-slate/route.ts` | Modified | Added `"supporters"` to collections array |
| `frontend/app/admin/page.tsx` | Modified | Added Supporters tab with table |

## Usage

### For Visitors
- Floating "💜 Support Gachard" button visible on every page (bottom-right)
- Click → panel opens with email form + optional message
- Submit → success confirmation with updated supporter count
- Same email again → "You're already on the list" (count unchanged)

### For Admins
- Navigate to `/admin` → click "Supporters" tab
- View all submissions: email, message, timestamp
- Data sorted newest first

### Clean Slate
- `POST /api/admin/clean-slate` now also deletes the `supporters` collection

## Verification

- `npx tsc --noEmit` — zero errors (ran after each implementation step)
- All 11 files committed, pushed to `feat/ai-anomaly-detection-oracle` and merged to `main`
- Deployed via Vercel auto-deploy from `main` branch

### Manual Testing Checklist
- [ ] Floating button visible bottom-right on all pages
- [ ] Button shows supporter count after load (hidden during fetch)
- [ ] Click button → panel opens with form
- [ ] Submit valid email → success state, count increments
- [ ] Submit same email → duplicate state, count unchanged
- [ ] Submit invalid email → inline validation error
- [ ] Empty message → saved as empty string
- [ ] Message > 500 chars → rejected with error
- [ ] Press Escape → panel closes, focus returns to button
- [ ] Click outside panel → panel closes
- [ ] Click inside panel → does NOT close
- [ ] Mobile: panel renders as centered modal
- [ ] Admin: Supporters tab shows all submissions
- [ ] Clean slate: supporters collection deleted

## Journey Log

- [lesson] MongoDB `createIndex` is idempotent — safe to call on every cold start without migration scripts
- [lesson] Vercel serverless requires MongoDB-based rate limiting; in-memory state doesn't persist across invocations
- [pivot] Used insert-then-catch (error code 11000) instead of check-then-insert to avoid race conditions on duplicate emails

## Source Materials

| File | Role | Notes |
|------|------|-------|
| `docs/compose/plans/2026-08-28-support-gachard.md` | Implementation plan | 6-task plan, all completed |
