import { getCollection } from "./mongodb";

export interface OddsEntry {
  rarity: number;   // 0=Common, 1=Rare, 2=Epic, 3=Legendary
  weight: number;   // bobot relatif
  label: string;
}

// Default odds table (bisa di-override dari MongoDB, lihat ADR-009)
const DEFAULT_ODDS: OddsEntry[] = [
  { rarity: 0, weight: 70, label: "Common" },
  { rarity: 1, weight: 20, label: "Rare" },
  { rarity: 2, weight: 8, label: "Epic" },
  { rarity: 3, weight: 2, label: "Legendary" },
];

/**
 * Get odds table from MongoDB or fall back to defaults.
 */
export async function getOddsTable(): Promise<OddsEntry[]> {
  try {
    const collection = await getCollection("odds");
    const stored = await collection.findOne({ name: "default" } as Record<string, unknown>);
    if (stored && (stored as Record<string, unknown>).entries) {
      return (stored as Record<string, unknown>).entries as OddsEntry[];
    }
  } catch {
    // Collection might not exist yet
  }
  return DEFAULT_ODDS;
}

/**
 * Weighted random pick based on odds table.
 * Returns rarity value (0-3).
 */
export async function pickRarity(): Promise<number> {
  const odds = await getOddsTable();
  const totalWeight = odds.reduce((sum, o) => sum + o.weight, 0);
  let random = Math.random() * totalWeight;

  for (const entry of odds) {
    random -= entry.weight;
    if (random <= 0) {
      return entry.rarity;
    }
  }

  return 0; // Fallback Common
}
