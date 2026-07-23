"use client";

import PageShell from "@/components/PageShell";

export default function PacksPage() {
  return (
    <PageShell
      testId="packs-page"
      eyebrow="Packs"
      title={
        <>
          <span className="text-gradient-aurora">Packs</span>
        </>
      }
      description="Open packs to discover new cards and build your collection."
    >
      <div className="glass p-8 text-center">
        <p className="text-white/60">Coming soon.</p>
      </div>
    </PageShell>
  );
}
