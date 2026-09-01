import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

/**
 * One-time fix: drop tokenId_1 unique index and recreate as sparse unique.
 * Sparse unique index allows multiple null values but enforces uniqueness for non-null.
 */
export async function POST() {
  try {
    const cardsCollection = await getCollection("cards");
    const indexes = await cardsCollection.indexes();
    const tokenIdIdx = indexes.find((i) => i.name === "tokenId_1");

    const results: string[] = [];

    if (tokenIdIdx) {
      await cardsCollection.dropIndex("tokenId_1");
      results.push("Dropped tokenId_1 index");
    }

    await cardsCollection.createIndex({ tokenId: 1 }, { unique: true, sparse: true });
    results.push("Created sparse unique tokenId index");

    // Verify
    const newIndexes = await cardsCollection.indexes();
    const newTokenIdx = newIndexes.find((i) => i.name === "tokenId_1");
    results.push(`Verified: ${JSON.stringify(newTokenIdx?.unique)} sparse: ${JSON.stringify(newTokenIdx?.sparse)}`);

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
