"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";

function safeNext(raw: string | null): string {
  if (!raw) return "/";
  // Only allow relative paths — block protocol-relative URLs and absolute URLs
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

function LoginInner() {
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoEnabled, setDemoEnabled] = useState(false);

  useEffect(() => {
    const flag = document.querySelector('meta[name="demo-login-enabled"]')?.getAttribute("content");
    setDemoEnabled(flag === "true");
  }, []);

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    setLoading(true);
    const redirectUrl = window.location.origin + "/auth-callback";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/demo", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not generate demo account");
      }
      const result = await res.json();
      localStorage.setItem("user", JSON.stringify(result));
      document.cookie = `gachard_uid=${encodeURIComponent(result.user_id)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
      window.location.href = next;
    } catch (err) {
      setError((err as Error).message || "Could not generate demo account");
      setLoading(false);
    }
  };

  return (
    <div className="relative flex-1 flex items-center justify-center px-5 py-16 lg:py-24" data-testid="login-page">
      <div className="grid-lines" />

      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 45% at 50% 40%, rgba(184,172,255,0.22), transparent 60%)",
        }}
      />

      <div
        className="relative z-10 w-full max-w-md glass p-8 sm:p-10"
        data-testid="login-card"
        style={{
          boxShadow: "0 30px 80px -20px rgba(138,92,255,0.35), 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex justify-center mb-6">
          <div
            className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: "rgba(184,172,255,0.08)",
              border: "1px solid rgba(184,172,255,0.25)",
              boxShadow: "0 0 40px -8px rgba(184,172,255,0.45)",
            }}
          >
            <Logo size={56} priority className="drop-shadow-[0_0_18px_rgba(184,172,255,0.6)]" />
          </div>
        </div>

        <div className="text-center mb-8">
          <p className="text-[0.72rem] uppercase tracking-[0.22em] mb-3" style={{ color: "var(--cosmic-violet)" }}>
            Welcome to Gachard
          </p>
          <h1
            className="font-display uppercase text-3xl sm:text-4xl leading-[0.98] mb-3"
            style={{ letterSpacing: "-0.03em" }}
            data-testid="login-title"
          >
            <span className="text-white">Enter the </span>
            <span className="text-gradient-aurora">universe</span>
          </h1>
          <p className="text-sm text-white/60 leading-relaxed">
            Sign in to start collecting, playing and trading in the Gachard ecosystem.
          </p>
        </div>

        {error && (
          <div
            className="mb-5 p-3.5 rounded-2xl text-sm"
            style={{
              background: "rgba(255,107,186,0.08)",
              border: "1px solid rgba(255,107,186,0.3)",
              color: "var(--aurora-pink)",
            }}
            data-testid="login-error"
          >
            {error}
          </div>
        )}

        {/* Google Sign-In via Emergent-managed OAuth */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 rounded-full px-5 py-3 font-medium text-sm transition-all disabled:opacity-50 hover:brightness-110 active:scale-[0.98]"
          style={{
            background: "#ffffff",
            color: "#1f1f1f",
            boxShadow: "0 8px 24px -8px rgba(255,255,255,0.25)",
          }}
          data-testid="login-google-btn"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          {loading ? "Redirecting…" : "Continue with Google"}
        </button>

        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[0.65rem] uppercase tracking-widest text-white/40">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Demo account — lets anyone try the full app without Google */}
        {demoEnabled ? (
          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="btn-primary w-full !justify-center disabled:opacity-50"
            data-testid="login-demo-btn"
          >
            {loading ? "Preparing…" : "Demo Account"}
          </button>
        ) : (
          <Link href="/" className="btn-ghost w-full !justify-center" data-testid="login-explore-guest">
            Explore as guest
          </Link>
        )}

        {demoEnabled && (
          <p className="mt-3 text-center text-[0.68rem] text-white/45">
            Creates a demo account instantly — try packs, cards, and the full experience.
          </p>
        )}

        <p className="mt-6 text-center text-[0.7rem] text-white/45 leading-relaxed">
          By continuing you agree to Gachard&apos;s Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center py-24">
          <div className="glass p-8 text-white/60">Loading…</div>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
