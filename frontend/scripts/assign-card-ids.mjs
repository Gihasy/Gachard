import { MongoClient } from "mongodb";
import { randomBytes } from "crypto";

const MONGODB_URL = process.env.MONGODB_URL || process.env.MONGO_URL;
const DATABASE_NAME = process.env.DATABASE_NAME || process.env.DB_NAME || "gachard";

if (!MONGODB_URL) {
  console.error("Refusing to run: set MONGODB_URL explicitly (no hardcoded fallback).");
  process.exit(1);
}

function generateCardId() {
  return randomBytes(3).toString("hex").slice(0, 5);
}

async function assignCardIds() {
  const client = new MongoClient(MONGODB_URL);
  await client.connect();
  const db = client.db(DATABASE_NAME);
  const cards = db.collection("cards");

  const allCards = await cards.find({}).toArray();
  console.log(`Found ${allCards.length} cards\n`);

  for (const card of allCards) {
    const cardId = generateCardId();
    await cards.updateOne({ _id: card._id }, { $set: { cardId } });
    console.log(`  Card #${card.tokenId ?? "?"}: assigned cardId=${cardId}`);
  }

  console.log(`\nDone. ${allCards.length} cards updated.`);
  await client.close();
}

assignCardIds().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
