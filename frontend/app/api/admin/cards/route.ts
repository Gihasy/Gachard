import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

export async function GET() {
  try {
    const cardsCollection = await getCollection("cards");
    const cards = await cardsCollection.find({}).toArray();

    const result = cards.map((c) => ({
      tokenId: c.tokenId,
      templateId: c.templateId,
      rarity: c.rarity,
      status: c.status || "pending",
      ownerAddress: c.ownerAddress,
      createdAt: c.createdAt,
    }));

    return NextResponse.json({ cards: result });
  } catch (error) {
    console.error("Admin cards error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
