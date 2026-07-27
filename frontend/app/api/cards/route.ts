import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { friendlyCardStatus } from "@/lib/status-map";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const usersCollection = await getCollection("users");
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) } as Record<string, unknown>);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const cardsCollection = await getCollection("cards");
    const cards = await cardsCollection
      .find({ ownerAddress: user.walletAddress })
      .toArray();

    // Lookup artworkUrl dari card_templates
    const templatesCollection = await getCollection("card_templates");
    const templates = await templatesCollection.find({}).toArray();
    const templateMap = new Map(templates.map((t) => [t.templateId, t]));

    const enrichedCards = cards.map((card) => {
      const template = templateMap.get(card.templateId);
      return {
        tokenId: card.tokenId,
        templateId: card.templateId,
        rarity: card.rarity,
        status: friendlyCardStatus(card.status || "Digital"),
        artworkUrl: template?.artworkUrl || "",
        templateName: template?.name || card.templateId,
      };
    });

    return NextResponse.json({ cards: enrichedCards });
  } catch (error) {
    console.error("Get cards error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
