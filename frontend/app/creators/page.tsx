"use client";

import { useState } from "react";
import PageShell from "@/components/PageShell";

const IP_TYPES = [
  "Game",
  "Comic or Manga",
  "Illustration or Art",
  "YouTube or Content Creator",
  "Existing Physical TCG",
  "Brand or Merchandise",
  "Other",
];

const COMMUNITY_SIZES = [
  "<1K",
  "1K–10K",
  "10K–100K",
  "100K+",
  "Prefer not to say",
];

export default function CreatorsPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    brandName: "",
    ipType: "",
    socialMedia: "",
    email: "",
    interest: "",
    communitySize: "",
    website_url: "", // honeypot
  });

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/creator-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Submission failed");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell
      testId="creators-page"
      eyebrow="FOR CREATORS & BRANDS"
      title={<span className="text-gradient-aurora">Become a Creator</span>}
      description="Bring your IP to life as a living, tradeable card game — without spending a cent to build it."
    >
      {/* Coming Soon Banner */}
      <div
        className="relative overflow-hidden rounded-3xl p-8 sm:p-10 mb-16"
        style={{
          background:
            "linear-gradient(135deg, rgba(138,92,255,0.15), rgba(255,107,186,0.10) 50%, rgba(0,204,255,0.12))",
          border: "1px solid rgba(184,172,255,0.28)",
        }}
      >
        <div className="relative z-10 text-center">
          <div className="chip mx-auto mb-5 w-fit">
            <span className="chip-dot" />
            <span>Coming Soon</span>
          </div>
          <h2 className="font-display uppercase text-3xl sm:text-4xl text-white mb-4">
            The Studio Is{" "}
            <span className="text-gradient-gold">Opening Soon</span>
          </h2>
          <p className="text-white/70 max-w-2xl mx-auto leading-relaxed">
            We&apos;re building the infrastructure for your world. If you&apos;re an artist, game designer, brand, or storyteller with a universe worth collecting, Gachard turns it into digital-native cards your community can collect, play, and trade — with ownership they can always verify is real. Join the waitlist to be first in line when partner onboarding opens.
          </p>
        </div>
      </div>

      {/* 3-Point Feature Grid */}
      <section className="mb-16" data-testid="creators-features">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Zero Upfront Cost */}
          <div
            className="glass p-8 relative overflow-hidden"
            style={{ borderColor: "rgba(0,204,255,0.2)" }}
          >
            <div
              className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-15"
              style={{ background: "var(--electric-blue)" }}
            />
            <div className="relative z-10">
              <span
                className="text-[0.65rem] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full inline-block mb-4"
                style={{
                  background: "rgba(0,204,255,0.15)",
                  color: "var(--electric-blue)",
                  border: "1px solid rgba(0,204,255,0.3)",
                }}
              >
                Zero Risk
              </span>
              <h4 className="font-display uppercase text-xl text-white mb-3">
                Zero Upfront Cost
              </h4>
              <p className="text-white/70 leading-relaxed">
                We handle the platform, minting, printing, and fulfillment. You bring the IP.
              </p>
            </div>
          </div>

          {/* Revenue Share */}
          <div
            className="glass p-8 relative overflow-hidden"
            style={{ borderColor: "rgba(255,196,102,0.2)" }}
          >
            <div
              className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-15"
              style={{ background: "var(--aurora-gold)" }}
            />
            <div className="relative z-10">
              <span
                className="text-[0.65rem] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full inline-block mb-4"
                style={{
                  background: "rgba(255,196,102,0.15)",
                  color: "var(--aurora-gold)",
                  border: "1px solid rgba(255,196,102,0.3)",
                }}
              >
                Revenue
              </span>
              <h4 className="font-display uppercase text-xl text-white mb-3">
                70/30 Revenue Share
              </h4>
              <p className="text-white/70 leading-relaxed">
                You keep the majority of every pack sold featuring your IP.
              </p>
            </div>
          </div>

          {/* Real Ownership */}
          <div
            className="glass p-8 relative overflow-hidden"
            style={{ borderColor: "rgba(184,172,255,0.2)" }}
          >
            <div
              className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-15"
              style={{ background: "var(--cosmic-violet)" }}
            />
            <div className="relative z-10">
              <span
                className="text-[0.65rem] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full inline-block mb-4"
                style={{
                  background: "rgba(184,172,255,0.15)",
                  color: "var(--cosmic-violet)",
                  border: "1px solid rgba(184,172,255,0.3)",
                }}
              >
                Ownership
              </span>
              <h4 className="font-display uppercase text-xl text-white mb-3">
                Real Ownership
              </h4>
              <p className="text-white/70 leading-relaxed">
                Your community collects verifiable, tradeable cards — not just static images.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Whitelist Form / Success Message */}
      <section className="mb-20" data-testid="creators-form-section">
        {submitted ? (
          <div
            className="glass p-10 text-center max-w-xl mx-auto"
            style={{ borderColor: "rgba(0,255,136,0.3)" }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: "rgba(0,255,136,0.15)", border: "1px solid rgba(0,255,136,0.3)" }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
            <h3 className="font-display uppercase text-xl text-white mb-3">
              You&apos;re on the list!
            </h3>
            <p className="text-white/70 leading-relaxed">
              Thanks for joining! We&apos;ll reach out when the creator program opens.
            </p>
          </div>
        ) : (
          <div
            className="glass p-8 sm:p-10 max-w-2xl mx-auto"
            style={{ borderColor: "rgba(184,172,255,0.2)" }}
          >
            <h3 className="font-display uppercase text-2xl text-white mb-2">
              Join the Waitlist
            </h3>
            <p className="text-white/50 text-sm mb-8">
              Tell us about your IP and we&apos;ll reach out when partner onboarding opens.
            </p>

            {error && (
              <div
                className="p-3 rounded-xl mb-6 text-sm"
                style={{ background: "rgba(255,107,186,0.1)", border: "1px solid rgba(255,107,186,0.3)", color: "#ff6bba" }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Honeypot — hidden from real users */}
              <div style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
                <label>
                  Website URL
                  <input type="text" name="website_url" value={form.website_url} onChange={(e) => set("website_url", e.target.value)} tabIndex={-1} autoComplete="off" />
                </label>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Your Name" required>
                  <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="Jane Doe" />
                </Field>
                <Field label="Brand / IP / Project Name" required>
                  <input type="text" value={form.brandName} onChange={(e) => set("brandName", e.target.value)} required placeholder="My Awesome Universe" />
                </Field>
              </div>

              <Field label="What Is It?" required>
                <select value={form.ipType} onChange={(e) => set("ipType", e.target.value)} required>
                  <option value="" disabled>Select a category…</option>
                  {IP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Social Media / Website" required>
                  <input type="text" value={form.socialMedia} onChange={(e) => set("socialMedia", e.target.value)} required placeholder="https://twitter.com/..." />
                </Field>
                <Field label="Email" required>
                  <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required placeholder="jane@example.com" />
                </Field>
              </div>

              <Field label="What excites you about Gachard?" required>
                <textarea
                  value={form.interest}
                  onChange={(e) => set("interest", e.target.value)}
                  required
                  minLength={10}
                  rows={3}
                  placeholder="Tell us why your community would love collectible cards…"
                />
              </Field>

              <Field label="Estimated Community Size">
                <select value={form.communitySize} onChange={(e) => set("communitySize", e.target.value)}>
                  <option value="">Prefer not to say</option>
                  {COMMUNITY_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full !py-3.5 disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Join the Waitlist"}
              </button>
            </form>
          </div>
        )}
      </section>
    </PageShell>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[0.7rem] uppercase tracking-widest text-white/50 mb-1.5">
        {label} {required && <span style={{ color: "var(--aurora-pink)" }}>*</span>}
      </label>
      {children}
      <style jsx>{`
        input, select, textarea {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 0.75rem;
          padding: 0.625rem 0.875rem;
          color: rgba(255,255,255,0.9);
          font-size: 0.875rem;
          outline: none;
          transition: border-color 200ms;
        }
        input:focus, select:focus, textarea:focus {
          border-color: rgba(184,172,255,0.5);
        }
        input::placeholder, textarea::placeholder {
          color: rgba(255,255,255,0.2);
        }
        select option {
          background: #1a1a2e;
          color: rgba(255,255,255,0.85);
        }
        textarea {
          resize: vertical;
          min-height: 80px;
        }
      `}</style>
    </div>
  );
}
