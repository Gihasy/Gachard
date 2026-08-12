import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

export async function GET() {
  try {
    const cardsCollection = await getCollection("cards");
    const usersCollection = await getCollection("users");
    const cards = await cardsCollection
      .find(
        {},
        {
          projection: {
            cardId: 1,
            tokenId: 1,
            templateId: 1,
            rarity: 1,
            status: 1,
            fulfillmentStatus: 1,
            ownerAddress: 1,
            createdAt: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .limit(1000)
      .toArray();

    // Build address → username map (only for card owners)
    const ownerAddresses = [...new Set(cards.map((c) => c.ownerAddress?.toLowerCase()).filter(Boolean))];
    const addressToUsername = new Map<string, string>();
    if (ownerAddresses.length > 0) {
      const owners = await usersCollection
        .find({ walletAddress: { $in: ownerAddresses } })
        .toArray();
      for (const u of owners) {
        if (u.walletAddress) {
          addressToUsername.set(u.walletAddress.toLowerCase(), `@${u.username}`);
        }
      }
    }

    const result = cards.map((c) => ({
      cardId: c.cardId || null,
      tokenId: c.tokenId,
      templateId: c.templateId,
      rarity: c.rarity,
      status: c.status || "pending",
      fulfillmentStatus: c.fulfillmentStatus || null,
      ownerAddress: c.ownerAddress,
      ownerUsername: c.ownerAddress ? addressToUsername.get(c.ownerAddress.toLowerCase()) || null : null,
      createdAt: c.createdAt,
    }));

    return NextResponse.json(
      { cards: result },
      { headers: { "Cache-Control": "no-store, private" } }
    );
  } catch (error) {
    console.error("Admin cards error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500, headers: { "Cache-Control": "no-store, private" } });
  }
}
