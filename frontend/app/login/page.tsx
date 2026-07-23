"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { googleLogin } from "@/lib/api";

const MARK_URL =
  "https://customer-assets-39nsmqrw.emergentagent.net/job_ui-modernize-78/artifacts/ny1n5epl_Gachard%20Logogram.png";

function LoginInner() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const mockToken = "mock-google-token";
      const result = await googleLogin(mockToken);
      localStorage.setItem("user", JSON.stringify(result));
      document.cookie = `gachard_uid=${encodeURIComponent(
        result.user_id
      )}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
      window.location.href = next;
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex-1 flex items-center justify-center px-5 py-16 lg:py-24"
      data-testid="login-page"
    >
      <div className="grid-lines" />

      {/* Ambient glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 45% at 50% 40%, rgba(184,172,255,0.22), transparent 60%)",
        }}
      />

      <div
        className="relative z-10 w-full max-w-md glass p-8 sm:p-10"
        data-testid="login-card"
        style={{
          boxShadow:
            "0 30px 80px -20px rgba(138,92,255,0.35), 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        {/* Logo mark */}
        <div className="flex justify-center mb-6">
          <div
            className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: "rgba(184,172,255,0.08)",
              border: "1px solid rgba(184,172,255,0.25)",
              boxShadow: "0 0 40px -8px rgba(184,172,255,0.45)",
            }}
          >
            <Image
              src={MARK_URL}
              alt="Gachard"
              width={44}
              height={44}
              className="object-contain drop-shadow-[0_0_18px_rgba(184,172,255,0.6)]"
              priority
            />
          </div>
        </div>

        <div className="text-center mb-8">
          <p
            className="text-[0.72rem] uppercase tracking-[0.22em] mb-3"
            style={{ color: "var(--cosmic-violet)" }}
          >
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
            Sign in to start collecting, playing and trading in the Gachard
            ecosystem.
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

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-full text-sm font-semibold transition-all disabled:opacity-60"
          style={{
            background: "#FFFFFF",
            color: "#0B0E1A",
            boxShadow:
              "0 8px 32px -8px rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.08)",
          }}
          data-testid="login-google-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              d="M21.35 11.1H12v2.9h5.35c-.24 1.4-1.68 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95s2.63-5.95 5.85-5.95c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.7 3.5 14.55 2.5 12 2.5 6.75 2.5 2.5 6.75 2.5 12s4.25 9.5 9.5 9.5c5.5 0 9.15-3.86 9.15-9.3 0-.62-.07-1.1-.15-1.6z"
              fill="#4285F4"
            />
          </svg>
          {loading ? "Signing in…" : "Continue with Google"}
        </button>

        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[0.65rem] uppercase tracking-widest text-white/40">
            or
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <Link
          href="/"
          className="btn-ghost w-full !justify-center"
          data-testid="login-explore-guest"
        >
          Explore as guest
        </Link>

        <p className="mt-6 text-center text-[0.7rem] text-white/45 leading-relaxed">
          By continuing you agree to Gachard's{" "}
          <a href="#" className="text-white/70 hover:text-white underline underline-offset-2">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="text-white/70 hover:text-white underline underline-offset-2">
            Privacy Policy
          </a>
          .
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
