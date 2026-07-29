"use client";

import { useState, useCallback } from "react";
import PackReveal, { type RevealResult, type RevealedCard } from "@/components/home/PackReveal";

const POOL: { name: string; rarity: number; artworkUrl: string }[] = [
  { name: "Ashvine", rarity: 0, artworkUrl: "/cards/common-1.png" },
  { name: "Dustling", rarity: 0, artworkUrl: "/cards/common-2.png" },
  { name: "Noxel", rarity: 1, artworkUrl: "/cards/rare-1.png" },
  { name: "Tidecaller", rarity: 1, artworkUrl: "/cards/rare-2.png" },
  { name: "Pyrax", rarity: 2, artworkUrl: "/cards/epic-1.png" },
  { name: "Voidwing", rarity: 2, artworkUrl: "/cards/epic-2.png" },
  { name: "Lumora", rarity: 3, artworkUrl: "/cards/legendary-1.png" },
  { name: "Astraeon", rarity: 3, artworkUrl: "/cards/legendary-2.png" },
];

function rollRarity(): number {
  const r = Math.random();
  if (r < 0.6) return 0;
  if (r < 0.87) return 1;
  if (r < 0.97) return 2;
  return 3;
}

function pick(rarity: number) {
  const options = POOL.filter((c) => c.rarity === rarity);
  return options[Math.floor(Math.random() * options.length)];
}

function generatePack(): RevealResult {
  const cards: RevealedCard[] = [];
  // guarantee at least one Rare+
  const rarities = [1, rollRarity(), rollRarity(), rollRarity(), rollRarity()];
  rarities.forEach((rar, i) => {
    const t = pick(rar);
    cards.push({
      tokenId: `demo-${i}-${Math.random().toString(36).slice(2, 7)}`,
      rarity: rar,
      template: { name: t.name, artworkUrl: t.artworkUrl },
    });
  });
  return { cards };
}

export default function PackDemo() {
  const [runId, setRunId] = useState(0);
  const [result, setResult] = useState<RevealResult>(() => generatePack());

  const reroll = useCallback(() => {
    setResult(generatePack());
    setRunId((n) => n + 1);
  }, []);

  return (
    <div data-testid="pack-demo">
      <PackReveal key={runId} result={result} packLabel="Demo Pack" />
      <div className="text-center -mt-6 pb-2">
        <button onClick={reroll} className="btn-ghost" data-testid="pack-demo-reset">
          Try Another Pack
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>
    </div>
  );
}
