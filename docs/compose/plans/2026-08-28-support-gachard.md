# Support Gachard — Floating CTA Implementation Plan

> [!NOTE]
> This document may not reflect the current implementation.
> See the final report for up-to-date state:
> [Final Report](../reports/support-gachard.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a floating "Support Gachard" CTA with email submission, supporter count, and feedback panel that visually inherits the existing Gachard cosmic design system.

**Architecture:** Client-side React component tree (`SupportGachard` → `SupportFloatingButton` + `SupportPanel` → `SupportForm` / `SupportSuccess`) backed by a MongoDB `supporters` collection with unique email constraint. API routes handle count fetch, submission, and duplicate detection. All UI uses existing Gachard CSS variables, glass surfaces, and gradient patterns.

**Tech Stack:** Next.js 16.2.11 (App Router), React 19, Tailwind CSS v4, MongoDB native driver

## Global Constraints

- Dark cosmic theme: `--deep-navy` (#0B0E1A) background, glassmorphism surfaces
- Colors: `--cosmic-violet` (#B8ACFF), `--aurora-pink` (#FF6BBA), `--electric-blue` (#00CCFF), `--aurora-gold` (#FFC466)
- Fonts: Unbounded (display/headings), Inter (body)
- Buttons: pill-shaped (border-radius: 999px), gradient backgrounds, glow shadows
- All components `"use client"`
- MongoDB via `getCollection()` from `frontend/lib/mongodb.ts`
- Inline styles for CSS custom property references and rgba values
- Respect `prefers-reduced-motion`
- Never expose individual supporter emails or messages publicly
- Supporter count = unique successful submissions only
- Do NOT modify existing logo, typography, navigation, hero, cards, page layout

---

### Task 1: MongoDB Collection + API Routes

**Files:**
- Create: `frontend/app/api/supporters/route.ts`
- Create: `frontend/app/api/supporters/count/route.ts`

**Interfaces:**
- Produces: `GET /api/supporters/count` → `{ count: number }`
- Produces: `POST /api/supporters` body: `{ email: string, message?: string }` → `{ success: true, count: number }` | `{ duplicate: true, count: number }` | `{ error: string }`
- Consumes: `getCollection("supporters")` from `frontend/lib/mongodb.ts`

- [ ] **Step 1: Create supporters count API route**

```typescript
// frontend/app/api/supporters/count/route.ts
import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

export async function GET() {
  try {
    const col = await getCollection("supporters");
    const count = await col.countDocuments();
    return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    console.error("[supporters/count]", error);
    return NextResponse.json({ count: 0 }, { headers: { "Cache-Control": "no-store, private" } });
  }
}
```

- [ ] **Step 2: Create supporters submission API route**

```typescript
// frontend/app/api/supporters/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const { email, message } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const col = await getCollection("supporters");

    // Check duplicate
    const existing = await col.findOne({ email: trimmed });
    if (existing) {
      const count = await col.countDocuments();
      return NextResponse.json({ duplicate: true, count });
    }

    // Insert
    await col.insertOne({
      email: trimmed,
      message: typeof message === "string" ? message.trim() : "",
      createdAt: new Date().toISOString(),
    });

    // Create unique index (idempotent)
    await col.createIndex({ email: 1 }, { unique: true }).catch(() => {});

    const count = await col.countDocuments();
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("[supporters]", error);
    return NextResponse.json({ error: "Something went wrong. Please try again in a moment." }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/api/supporters/
git commit -m "feat(api): add supporters count and submission routes"
```

---

### Task 2: Support Service Layer

**Files:**
- Create: `frontend/lib/supporters.ts`

**Interfaces:**
- Produces: `getSupporterCount(): Promise<number>`
- Produces: `submitSupporter(email: string, message?: string): Promise<{ success: boolean; duplicate: boolean; count: number; error?: string }>`

- [ ] **Step 1: Create supporters service**

```typescript
// frontend/lib/supporters.ts
export async function getSupporterCount(): Promise<number> {
  try {
    const res = await fetch("/api/supporters/count");
    const data = await res.json();
    return data.count ?? 0;
  } catch {
    return 0;
  }
}

export async function submitSupporter(
  email: string,
  message?: string
): Promise<{ success: boolean; duplicate: boolean; count: number; error?: string }> {
  try {
    const res = await fetch("/api/supporters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, message }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, duplicate: false, count: 0, error: data.error || "Something went wrong." };
    }
    return {
      success: data.success ?? false,
      duplicate: data.duplicate ?? false,
      count: data.count ?? 0,
    };
  } catch {
    return { success: false, duplicate: false, count: 0, error: "Something went wrong. Please try again in a moment." };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/supporters.ts
git commit -m "feat(lib): add supporters service layer"
```

---

### Task 3: SupportFloatingButton Component

**Files:**
- Create: `frontend/components/support/SupportFloatingButton.tsx`

**Interfaces:**
- Produces: `SupportFloatingButton({ count, onClick })` — fixed bottom-right floating button
- Props: `count: number`, `onClick: () => void`

- [ ] **Step 1: Create SupportFloatingButton component**

```tsx
// frontend/components/support/SupportFloatingButton.tsx
"use client";

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export default function SupportFloatingButton({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label="Support Gachard"
      className="group"
      style={{
        position: "fixed",
        right: "clamp(16px, 2vw, 24px)",
        bottom: "max(clamp(80px, 8vh, 110px), env(safe-area-inset-bottom, 0px) + 80px)",
        zIndex: 45,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "6px",
        padding: "14px 22px",
        borderRadius: "999px",
        border: "1px solid rgba(184, 172, 255, 0.25)",
        background: "linear-gradient(135deg, rgba(138, 92, 255, 0.2), rgba(255, 107, 186, 0.15), rgba(0, 204, 255, 0.1))",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxShadow: "0 4px 24px rgba(138, 92, 255, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05) inset",
        cursor: "pointer",
        transition: "all 250ms ease",
        color: "var(--silver-mist)",
        fontFamily: "var(--font-body)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px) scale(1.03)";
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(138, 92, 255, 0.35), 0 0 20px rgba(184, 172, 255, 0.15) inset";
        e.currentTarget.style.borderColor = "rgba(184, 172, 255, 0.45)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0) scale(1)";
        e.currentTarget.style.boxShadow = "0 4px 24px rgba(138, 92, 255, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05) inset";
        e.currentTarget.style.borderColor = "rgba(184, 172, 255, 0.25)";
      }}
    >
      <span style={{ fontSize: "0.88rem", fontWeight: 600, letterSpacing: "-0.01em" }}>
        💜 Support Gachard
      </span>
      {count > 0 && (
        <span style={{ fontSize: "0.68rem", color: "var(--silver-mist-dim)", letterSpacing: "0.02em" }}>
          {formatCount(count)} collectors are already in
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/support/SupportFloatingButton.tsx
git commit -m "feat(ui): add SupportFloatingButton component"
```

---

### Task 4: SupportPanel + SupportForm + SupportSuccess Components

**Files:**
- Create: `frontend/components/support/SupportPanel.tsx`
- Create: `frontend/components/support/SupportForm.tsx`
- Create: `frontend/components/support/SupportSuccess.tsx`

**Interfaces:**
- Produces: `SupportPanel({ isOpen, onClose, count, children })` — glass panel with backdrop
- Produces: `SupportForm({ onSubmit, isLoading, error })` — email + message form
- Produces: `SupportSuccess({ count, isDuplicate, onDone })` — success/duplicate state
- Consumes: `submitSupporter()` from Task 2

- [ ] **Step 1: Create SupportPanel component**

```tsx
// frontend/components/support/SupportPanel.tsx
"use client";

import { useEffect, useRef } from "react";

export default function SupportPanel({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    // Focus first input
    setTimeout(() => {
      const firstInput = panelRef.current?.querySelector("input, textarea");
      if (firstInput instanceof HTMLElement) firstInput.focus();
    }, 100);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Support Gachard"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-end",
        padding: "0 clamp(16px, 2vw, 24px) max(clamp(140px, 12vh, 180px), env(safe-area-inset-bottom, 0px) + 140px)",
        background: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(420px, calc(100vw - 32px))",
          maxHeight: "min(520px, calc(100vh - 200px))",
          overflowY: "auto",
          borderRadius: "20px",
          border: "1px solid rgba(184, 172, 255, 0.2)",
          background: "linear-gradient(180deg, rgba(15, 19, 36, 0.97), rgba(11, 14, 26, 0.98))",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 16px 64px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset",
          padding: "28px",
          animation: "supportPanelIn 250ms ease-out",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            background: "rgba(255, 255, 255, 0.05)",
            color: "var(--silver-mist-dim)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            transition: "all 200ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
            e.currentTarget.style.color = "var(--silver-mist-dim)";
          }}
        >
          ✕
        </button>
        {children}
      </div>
      <style>{`
        @keyframes supportPanelIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes supportPanelIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        }
        @media (max-width: 640px) {
          div[role="dialog"] {
            align-items: center !important;
            justify-content: center !important;
            padding: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Create SupportForm component**

```tsx
// frontend/components/support/SupportForm.tsx
"use client";

import { useState } from "react";

export default function SupportForm({
  count,
  onSubmit,
  isLoading,
  error,
}: {
  count: number;
  onSubmit: (email: string, message: string) => void;
  isLoading: boolean;
  error: string | null;
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError(null);
    onSubmit(trimmed, message);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1px solid rgba(230, 232, 240, 0.12)",
    background: "rgba(255, 255, 255, 0.04)",
    color: "#fff",
    fontSize: "0.88rem",
    fontFamily: "var(--font-body)",
    outline: "none",
    transition: "border-color 200ms ease",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.72rem",
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    color: "var(--silver-mist-dim)",
    marginBottom: "6px",
    display: "block",
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Header */}
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 700, color: "#fff", marginBottom: "8px" }}>
        Love this project? 💜
      </h3>
      <p style={{ fontSize: "0.82rem", color: "var(--silver-mist-dim)", marginBottom: "6px", lineHeight: 1.5 }}>
        Help us prove there&apos;s a community waiting for Gachard.
      </p>
      {count > 0 && (
        <p style={{ fontSize: "0.78rem", color: "var(--cosmic-violet)", marginBottom: "16px" }}>
          Join {count.toLocaleString("en-US")}+ early collectors who want to see Gachard built.
        </p>
      )}
      <p style={{ fontSize: "0.78rem", color: "var(--silver-mist-dim)", marginBottom: "20px", lineHeight: 1.5 }}>
        Leave your email and tell us what you think. Your feedback helps us validate demand and prioritize what we build next.
      </p>

      {/* Email field */}
      <div style={{ marginBottom: "16px" }}>
        <label htmlFor="support-email" style={labelStyle}>Email</label>
        <input
          id="support-email"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
          placeholder="Enter your email"
          required
          style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(184, 172, 255, 0.4)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(230, 232, 240, 0.12)"; }}
        />
        {emailError && (
          <p style={{ fontSize: "0.72rem", color: "#ff6bba", marginTop: "6px" }} role="alert">{emailError}</p>
        )}
      </div>

      {/* Message field */}
      <div style={{ marginBottom: "20px" }}>
        <label htmlFor="support-message" style={labelStyle}>
          Your thoughts <span style={{ opacity: 0.5 }}>(Optional)</span>
        </label>
        <textarea
          id="support-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What do you think about Gachard? What would you love to see next?"
          rows={3}
          style={{ ...inputStyle, resize: "vertical", minHeight: "80px" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(184, 172, 255, 0.4)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(230, 232, 240, 0.12)"; }}
        />
      </div>

      {/* Error */}
      {error && (
        <p style={{ fontSize: "0.78rem", color: "#ff6bba", marginBottom: "12px" }} role="alert">{error}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        style={{
          width: "100%",
          padding: "14px 24px",
          borderRadius: "999px",
          border: "none",
          background: isLoading ? "rgba(138, 92, 255, 0.3)" : "linear-gradient(135deg, #FF6BBA, #8A5CFF 55%, #00CCFF)",
          color: "#fff",
          fontSize: "0.88rem",
          fontWeight: 600,
          fontFamily: "var(--font-body)",
          cursor: isLoading ? "not-allowed" : "pointer",
          transition: "all 250ms ease",
          boxShadow: isLoading ? "none" : "0 4px 20px rgba(138, 92, 255, 0.3)",
          letterSpacing: "0.02em",
        }}
      >
        {isLoading ? "Joining..." : "I Support Gachard →"}
      </button>

      <p style={{ fontSize: "0.68rem", color: "var(--silver-mist-dim)", textAlign: "center", marginTop: "12px", opacity: 0.6 }}>
        Be part of the early community.
      </p>
    </form>
  );
}
```

- [ ] **Step 3: Create SupportSuccess component**

```tsx
// frontend/components/support/SupportSuccess.tsx
"use client";

export default function SupportSuccess({
  count,
  isDuplicate,
  onDone,
}: {
  count: number;
  isDuplicate: boolean;
  onDone: () => void;
}) {
  return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 700, color: "#fff", marginBottom: "8px" }}>
        {isDuplicate ? "You're already on the list! 💜" : "You're in! 💜"}
      </h3>
      <p style={{ fontSize: "0.85rem", color: "var(--silver-mist-dim)", marginBottom: "16px", lineHeight: 1.5 }}>
        {isDuplicate
          ? "You've already joined the Gachard early community."
          : "Thanks for supporting Gachard. We'll keep you posted."}
      </p>
      {count > 0 && (
        <p style={{ fontSize: "0.82rem", color: "var(--cosmic-violet)", marginBottom: "24px" }}>
          You are now part of {count.toLocaleString("en-US")} early collectors.
        </p>
      )}
      <button
        onClick={onDone}
        style={{
          padding: "12px 32px",
          borderRadius: "999px",
          border: "1px solid rgba(184, 172, 255, 0.3)",
          background: "rgba(184, 172, 255, 0.1)",
          color: "var(--cosmic-violet)",
          fontSize: "0.85rem",
          fontWeight: 600,
          fontFamily: "var(--font-body)",
          cursor: "pointer",
          transition: "all 200ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(184, 172, 255, 0.2)";
          e.currentTarget.style.borderColor = "rgba(184, 172, 255, 0.5)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(184, 172, 255, 0.1)";
          e.currentTarget.style.borderColor = "rgba(184, 172, 255, 0.3)";
        }}
      >
        Done
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/support/
git commit -m "feat(ui): add SupportPanel, SupportForm, SupportSuccess components"
```

---

### Task 5: SupportGachard Parent Component + Layout Integration

**Files:**
- Create: `frontend/components/support/SupportGachard.tsx`
- Modify: `frontend/app/layout.tsx` (add `<SupportGachard />`)

**Interfaces:**
- Produces: `SupportGachard()` — manages state, renders button + panel
- Consumes: `getSupporterCount()`, `submitSupporter()` from Task 2
- Consumes: `SupportFloatingButton` from Task 3
- Consumes: `SupportPanel`, `SupportForm`, `SupportSuccess` from Task 4

- [ ] **Step 1: Create SupportGachard parent component**

```tsx
// frontend/components/support/SupportGachard.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import SupportFloatingButton from "./SupportFloatingButton";
import SupportPanel from "./SupportPanel";
import SupportForm from "./SupportForm";
import SupportSuccess from "./SupportSuccess";
import { getSupporterCount, submitSupporter } from "@/lib/supporters";

type ViewState = "form" | "success" | "duplicate";

export default function SupportGachard() {
  const [count, setCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [viewState, setViewState] = useState<ViewState>("form");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);

  useEffect(() => {
    getSupporterCount().then(setCount);
  }, []);

  const handleSubmit = useCallback(async (email: string, message: string) => {
    setIsLoading(true);
    setError(null);
    const result = await submitSupporter(email, message);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setCount(result.count);
    if (result.duplicate) {
      setIsDuplicate(true);
      setViewState("duplicate");
    } else {
      setIsDuplicate(false);
      setViewState("success");
    }
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    // Reset to form after close animation
    setTimeout(() => setViewState("form"), 300);
  }, []);

  const handleDone = useCallback(() => {
    handleClose();
  }, [handleClose]);

  return (
    <>
      <SupportFloatingButton count={count} onClick={() => setIsOpen(true)} />
      <SupportPanel isOpen={isOpen} onClose={handleClose}>
        {viewState === "form" && (
          <SupportForm
            count={count}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            error={error}
          />
        )}
        {(viewState === "success" || viewState === "duplicate") && (
          <SupportSuccess
            count={count}
            isDuplicate={isDuplicate}
            onDone={handleDone}
          />
        )}
      </SupportPanel>
    </>
  );
}
```

- [ ] **Step 2: Add SupportGachard to root layout**

In `frontend/app/layout.tsx`, add import and render inside the `<body>`:

```tsx
import SupportGachard from "@/components/support/SupportGachard";
```

Add `<SupportGachard />` just before the closing `</body>` tag (after `{children}`).

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/support/SupportGachard.tsx frontend/app/layout.tsx
git commit -m "feat: add SupportGachard floating CTA to root layout"
```

---

### Task 6: Clean Slate Update + Verification

**Files:**
- Modify: `frontend/app/api/admin/clean-slate/route.ts` (add "supporters" to collections list)

- [ ] **Step 1: Add supporters to clean-slate collections**

In `frontend/app/api/admin/clean-slate/route.ts`, add `"supporters"` to the `collections` array.

- [ ] **Step 2: Verify full build**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Deploy and test**

Deploy to Vercel, then:
1. Open site — floating button visible bottom-right
2. Click button — panel opens with form
3. Submit valid email — success state, count increments
4. Submit same email — duplicate state, count unchanged
5. Submit invalid email — inline error
6. Press Escape — panel closes
7. Click outside panel — panel closes
8. Check mobile layout — panel becomes centered modal

- [ ] **Step 4: Commit**

```bash
git add frontend/app/api/admin/clean-slate/route.ts
git commit -m "feat(clean-slate): add supporters collection"
```

---

## Execution Order & Dependencies

```
Task 1 (API Routes) — independent
Task 2 (Service Layer) — depends on Task 1 (API routes exist)
Task 3 (FloatingButton) — independent
Task 4 (Panel + Form + Success) — independent
Task 5 (Parent + Layout) — depends on Tasks 2, 3, 4
Task 6 (Clean Slate + Verify) — depends on Task 1

Parallelizable: Tasks 1, 3, 4 can start immediately.
Sequential chain: 1 → 2 → 5, 3 → 5, 4 → 5, 1 → 6.
```
