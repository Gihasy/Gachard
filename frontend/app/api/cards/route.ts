import { NextResponse } from "next/server";
import { getCollection, parseObjectId } from "@/lib/mongodb";
import { confirmTransaction } from "@/lib/transactions";

/**
 * Derive user-facing display status from fulfillmentStatus.
 * fulfillmentStatus drives the label — not the on-chain card.status.
 */
function getDisplayStatus(fulfillmentStatus: string | null | undefined): string {
  if (!fulfillmentStatus) return "Digital";
  if (["Locked", "Processing", "Printed"].includes(fulfillmentStatus)) return "In Progress";
  if (fulfillmentStatus === "Shipping") return "Shipping";
  if (fulfillmentStatus === "Real") return "Real";
  return "Digital";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const usersCollection = await getCollection("users");
    const user = await usersCollection.findOne({ _id: parseObjectId(userId) } as Record<string, unknown>);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const cardsCollection = await getCollection("cards");
    const templatesCollection = await getCollection("card_templates");

    // Auto-reconciliation: if any cards are pending, try to confirm their transactions
    const pendingCards = await cardsCollection
      .find({ ownerAddress: user.walletAddress, status: "pending" })
      .toArray();

    if (pendingCards.length > 0) {
      const txCollection = await getCollection("transactions");
      const pendingTxIds = [...new Set(pendingCards.map((c) => c.txId).filter(Boolean))];

      for (const txId of pendingTxIds) {
        try {
          await confirmTransaction(txId);
        } catch {
          // Silent fail — will retry next time user opens collection
        }
      }
    }

    // Fetch cards (possibly updated by reconciliation above)
    const cards = await cardsCollection
      .find({ ownerAddress: user.walletAddress })
      .sort({ createdAt: -1 })
      .toArray();

    // Lookup artworkUrl dari card_templates
    const templates = await templatesCollection
      .find({}, { projection: { templateId: 1, artworkUrl: 1, name: 1 } })
      .toArray();
    const templateMap = new Map(templates.map((t) => [t.templateId, t]));

    const enrichedCards = cards.map((card) => {
      const template = templateMap.get(card.templateId);
      return {
        cardId: card.cardId || null,
        tokenId: card.tokenId,
        templateId: card.templateId,
        rarity: card.rarity,
        displayStatus: getDisplayStatus(card.fulfillmentStatus),
        artworkUrl: template?.artworkUrl || "",
        templateName: template?.name || card.templateId,
        requestedAt: card.fulfillmentStatus ? card.updatedAt || null : null,
        deliveredAt: card.deliveredAt || null,
        claimId: card.claimId || null,
        isNew: !card.viewed,
        createdAt: card.createdAt || null,
      };
    });

    return NextResponse.json({ cards: enrichedCards });
  } catch (error) {
    console.error("Get cards error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
