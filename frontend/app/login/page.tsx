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
      // In production, use Google Sign-In SDK
      // For now, simulate with a placeholder token
      const mockToken = "mock-google-token";
      const result = await googleLogin(mockToken);

      // Store user info
      localStorage.setItem("user", JSON.stringify(result));

      // Redirect to home
      window.location.href = "/";
    } catch (err) {
      setError("Login gagal. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <h1 className="text-3xl font-bold text-center mb-8">Login ke Gachard</h1>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>
      )}

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full bg-white border border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? "Loading..." : "Login dengan Google"}
      </button>
    </div>
  );
}
