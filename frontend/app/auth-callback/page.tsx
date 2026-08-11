"use client";

import { useEffect, useRef, useState } from "react";
import Logo from "@/components/Logo";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallbackPage() {
  const processed = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // useRef guard (StrictMode-safe): one-time session exchange.
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) {
      window.location.replace("/login");
      return;
    }
    const sessionId = decodeURIComponent(match[1]);

    (async () => {
      try {
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ session_id: sessionId }),
        });
        if (!res.ok) throw new Error("Authentication failed. Please try again.");
        const result = await res.json();

        localStorage.setItem(
          "user",
          JSON.stringify({
            user_id: result.user_id,
            username: result.username,
            email: result.email,
          })
        );

        // Strip the session_id fragment, then enter the app.
        window.history.replaceState(null, "", "/auth-callback");
        window.location.replace("/collection");
      } catch (e) {
        setError((e as Error).message || "Authentication failed");
      }
    })();
  }, []);

  return (
    <div
      className="flex-1 flex items-center justify-center px-5 py-24"
      data-testid="auth-callback"
    >
      <div className="glass p-8 sm:p-10 w-full max-w-sm text-center">
        <div className="flex justify-center mb-6">
          <Logo size={56} priority className="drop-shadow-[0_0_18px_rgba(184,172,255,0.6)]" />
        </div>
        {error ? (
          <>
            <p
              className="text-sm mb-4"
              style={{ color: "var(--aurora-pink)" }}
              data-testid="auth-callback-error"
            >
              {error}
            </p>
            <a href="/login" className="btn-primary w-full !justify-center">
              Back to login
            </a>
          </>
        ) : (
          <>
            <div
              className="w-8 h-8 mx-auto rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--cosmic-violet)", borderTopColor: "transparent" }}
            />
            <p className="mt-5 text-white/70 uppercase tracking-widest text-xs">
              Signing you in…
            </p>
          </>
        )}
      </div>
    </div>
  );
}
