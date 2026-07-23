"use client";

import { useState } from "react";
import { googleLogin } from "@/lib/api";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const mockToken = "mock-google-token";
      const result = await googleLogin(mockToken);

      localStorage.setItem("user", JSON.stringify(result));
      window.location.href = "/";
    } catch (err) {
      setError("Login gagal. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <h1
        className="text-3xl font-bold text-center mb-8 uppercase"
        style={{ color: "var(--text-primary)" }}
      >
        Login ke Gachard
      </h1>

      {error && (
        <div
          className="p-3 rounded mb-4"
          style={{ background: "rgba(255,107,186,0.1)", color: "var(--aurora-pink)" }}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="btn-cta w-full py-3 px-4 text-sm disabled:opacity-50"
      >
        {loading ? "Loading..." : "Login dengan Google"}
      </button>
    </div>
  );
}
