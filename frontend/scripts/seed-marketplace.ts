/**
 * Seed marketplace demo data — dummy "sold" transactions for FVM and Trade page demo.
 * Run: cd frontend && npx tsx scripts/seed-marketplace.ts
 *
 * IMPORTANT: Uses existing demo users only. Does NOT create new users.
 * Creates ownership chains on specific cards (A->B->C->D) for demo richness.
 */

import { MongoClient, ObjectId } from "mongodb";

const MONGODB_URL = process.env.MONGODB_URL || "";

// Rarity price ranges (in cents/Credit)
const PRICE_RANGES: Record<number, { min: number; max: number; count: [number, number] }> = {
  0: { min: 50, max: 150, count: [6, 7] },
  1: { min: 200, max: 500, count: [5, 6] },
  2: { min: 600, max: 1200, count: [3, 4] },
  3: { min: 1500, max: 3000, count: [2, 3] },
};

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPrice(min: number, max: number) {
  return Math.round(randomInt(min, max) / 10) * 10;
}

function pastDate(daysAgo: number, jitterDays = 3) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo + randomInt(-jitterDays, jitterDays));
  d.setHours(randomInt(8, 22), randomInt(0, 59), randomInt(0, 59));
  return d.toISOString();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = any;

async function seed() {
  const client = new MongoClient(MONGODB_URL);
  await client.connect();
  const db = client.db();

  const usersCol = db.collection("users");
  const cardsCol = db.collection("cards");
  const txCol = db.collection("transactions");
  const templatesCol = db.collection("card_templates");

  // Get existing demo users
  const users = await usersCol.find({}).toArray();
  if (users.length < 6) {
    console.error("Need at least 6 demo users. Found:", users.length);
    process.exit(1);
  }
  console.log(`Found ${users.length} users`);

  // Get existing cards (Digital status, not listed)
  const cards = await cardsCol
    .find({ status: "Digital" })
    .sort({ tokenId: 1 })
    .toArray();
  if (cards.length < 10) {
    console.error("Need at least 10 Digital cards. Found:", cards.length);
    process.exit(1);
  }
  console.log(`Found ${cards.length} Digital cards`);

  // Get templates for rarity info
  const templates = await templatesCol.find({}).toArray();

  // Clear existing sold transactions
  const deleteResult = await txCol.deleteMany({ type: "sold" });
  console.log(`Deleted ${deleteResult.deletedCount} existing sold transactions`);

  const transactions: AnyDoc[] = [];
  let txTimestamp = 21; // days ago, will count down

  // === OWNERSHIP CHAINS (3 cards with multiple trades) ===
  const cardsByRarity = new Map<number, typeof cards>();
  for (const card of cards) {
    const r = card.rarity ?? 0;
    if (!cardsByRarity.has(r)) cardsByRarity.set(r, []);
    cardsByRarity.get(r)!.push(card);
  }

  // Chain 1: Legendary card — 5 trades (needs 6 users)
  const chain1Card = cardsByRarity.get(3)?.[0] || cardsByRarity.get(2)?.[0] || cards[0];
  // Chain 2: Epic card — 4 trades (needs 5 users)
  const chain2Card = cardsByRarity.get(2)?.[0] || cardsByRarity.get(1)?.[0] || cards[1];
  // Chain 3: Rare card — 3 trades (needs 4 users)
  const chain3Card = cardsByRarity.get(1)?.[0] || cards[2];

  const chainConfigs = [
    { card: chain1Card, trades: 5, basePrice: chain1Card.rarity === 3 ? 2000 : 800, variance: 300 },
    { card: chain2Card, trades: 4, basePrice: chain2Card.rarity === 2 ? 900 : 400, variance: 200 },
    { card: chain3Card, trades: 3, basePrice: chain3Card.rarity === 1 ? 350 : 100, variance: 100 },
  ];

  for (const chain of chainConfigs) {
    const chainUsers = users.slice(0, chain.trades + 1);
    let price = chain.basePrice;

    for (let i = 0; i < chain.trades; i++) {
      price = Math.max(50, price + randomInt(-chain.variance, chain.variance));
      price = Math.round(price / 10) * 10;

      const rarity = chain.card.rarity ?? 0;
      const templateId = chain.card.templateId;
      const daysBack = txTimestamp - i * 2;
      const fromUser = chainUsers[i];
      const toUser = chainUsers[i + 1];

      transactions.push({
        _id: new ObjectId(),
        userId: toUser._id.toString(),
        type: "sold",
        tokenId: chain.card.tokenId,
        tokenIds: [chain.card.tokenId],
        rarity,
        rarities: [rarity],
        templateIds: [templateId],
        amount: price,
        purchasePrice: price,
        txHash: null,
        status: "confirmed",
        contractAddress: process.env.CONTRACT_ADDRESS || "",
        fromAddress: fromUser.walletAddress || "0x0000000000000000000000000000000000000000",
        toAddress: toUser.walletAddress || "0x0000000000000000000000000000000000000000",
        error: "",
        createdAt: pastDate(daysBack),
        updatedAt: pastDate(daysBack),
      });
    }
    console.log(`Chain: ${chain.card.cardId} (${["Common", "Rare", "Epic", "Legendary"][chain.card.rarity ?? 0]}) — ${chain.trades} trades`);
  }

  // === INDEPENDENT SOLD TRANSACTIONS (fill up per rarity) ===
  const usedCardIds = new Set(chainConfigs.map((c) => c.card.cardId));

  for (const [rarityStr, config] of Object.entries(PRICE_RANGES)) {
    const rarity = parseInt(rarityStr);
    const count = randomInt(config.count[0], config.count[1]);
    const rarityCards = cards.filter(
      (c) => (c.rarity ?? 0) === rarity && !usedCardIds.has(c.cardId)
    );

    for (let i = 0; i < count && i < rarityCards.length; i++) {
      const card = rarityCards[i];
      usedCardIds.add(card.cardId);
      const price = randomPrice(config.min, config.max);
      const sellerIdx = randomInt(0, users.length - 1);
      let buyerIdx = randomInt(0, users.length - 1);
      while (buyerIdx === sellerIdx) buyerIdx = randomInt(0, users.length - 1);

      const seller = users[sellerIdx];
      const buyer = users[buyerIdx];

      transactions.push({
        _id: new ObjectId(),
        userId: buyer._id.toString(),
        type: "sold",
        tokenId: card.tokenId,
        tokenIds: [card.tokenId],
        rarity,
        rarities: [rarity],
        templateIds: [card.templateId],
        amount: price,
        purchasePrice: price,
        txHash: null,
        status: "confirmed",
        contractAddress: process.env.CONTRACT_ADDRESS || "",
        fromAddress: seller.walletAddress || "0x0000000000000000000000000000000000000000",
        toAddress: buyer.walletAddress || "0x0000000000000000000000000000000000000000",
        error: "",
        createdAt: pastDate(txTimestamp - i * 3),
        updatedAt: pastDate(txTimestamp - i * 3),
      });
    }
    console.log(`Independent: ${count} ${["Common", "Rare", "Epic", "Legendary"][rarity]} transactions`);
  }

  // Insert all
  if (transactions.length > 0) {
    await txCol.insertMany(transactions);
  }

  // Update cards used in ownership chains to match final owner
  for (const chain of chainConfigs) {
    const chainUsers = users.slice(0, chain.trades + 1);
    const finalOwner = chainUsers[chain.trades]; // last buyer in chain
    await cardsCol.updateOne(
      { cardId: chain.card.cardId },
      {
        $set: {
          ownerAddress: finalOwner.walletAddress || "",
          lastOwner: finalOwner.walletAddress || "",
          updatedAt: new Date().toISOString(),
        },
      }
    );
    console.log(`Updated card ${chain.card.cardId} owner to ${finalOwner.username || finalOwner._id}`);
  }

  console.log(`\nSeeded ${transactions.length} sold transactions total`);
  await client.close();
}

seed().catch(console.error);
