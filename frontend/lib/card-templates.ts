import { getCollection } from "./mongodb";

export interface CardTemplate {
  templateId: string;
  rarity: number;   // 0=Common, 1=Rare, 2=Epic, 3=Legendary
  name: string;
  artworkUrl: string;
}

// Default placeholder templates (2 per rarity)
const DEFAULT_TEMPLATES: CardTemplate[] = [
  { templateId: "common-1", rarity: 0, name: "Common Card A", artworkUrl: "" },
  { templateId: "common-2", rarity: 0, name: "Common Card B", artworkUrl: "" },
  { templateId: "rare-1", rarity: 1, name: "Rare Card A", artworkUrl: "" },
  { templateId: "rare-2", rarity: 1, name: "Rare Card B", artworkUrl: "" },
  { templateId: "epic-1", rarity: 2, name: "Epic Card A", artworkUrl: "" },
  { templateId: "epic-2", rarity: 2, name: "Epic Card B", artworkUrl: "" },
  { templateId: "legendary-1", rarity: 3, name: "Legendary Card A", artworkUrl: "" },
  { templateId: "legendary-2", rarity: 3, name: "Legendary Card B", artworkUrl: "" },
];

/**
 * Seed card_templates collection with defaults if empty.
 */
export async function seedCardTemplates(): Promise<void> {
  const collection = await getCollection("card_templates");
  const count = await collection.countDocuments();
  if (count === 0) {
    await collection.insertMany(DEFAULT_TEMPLATES);
  }
}

/**
 * Pick a random card template for the given rarity.
 */
export async function pickCardTemplate(rarity: number): Promise<CardTemplate> {
  const collection = await getCollection("card_templates");
  const templates = (await collection.find({ rarity }).toArray()) as unknown as CardTemplate[];

  if (templates.length === 0) {
    // Fallback to defaults if DB is empty
    const fallback = DEFAULT_TEMPLATES.filter((t) => t.rarity === rarity);
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  return templates[Math.floor(Math.random() * templates.length)];
}
