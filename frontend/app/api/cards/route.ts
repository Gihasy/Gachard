import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { confirmTransaction } from "@/lib/transactions";
import { getAuthenticatedUser } from "@/lib/session";

/**
 * Derive user-facing display status from fulfillmentStatus.
 * fulfillmentStatus drives the label — not the on-chain card.status.
 */
function getDisplayStatus(fulfillmentStatus: string | null | undefined, cardStatus?: string): string {
  if (cardStatus === "Burned") return "Burned";
  if (!fulfillmentStatus) return "Digital";
  if (["Locked", "Processing", "Printed"].includes(fulfillmentStatus)) return "In Progress";
  if (fulfillmentStatus === "Shipping") return "Shipping";
  if (fulfillmentStatus === "Real") return "Real";
  return "Digital";
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user._id.toString();

    const cardsCollection = await getCollection("cards");
    const templatesCollection = await getCollection("card_templates");

    // Auto-reconciliation: if any cards are pending, try to confirm their transactions
    const pendingCards = await cardsCollection
      .find({ ownerAddress: user.walletAddress, status: "pending" })
      .toArray();

    if (pendingCards.length > 0) {
      const txCollection = await getCollection("transactions");
      const pendingTxIds = [...new Set(pendingCards.map((c) => c.txId).filter(Boolean))];

      // Confirm all pending transactions in parallel
      await Promise.allSettled(
        pendingTxIds.map((txId) => confirmTransaction(txId))
      );
    }

    // Fetch cards (possibly updated by reconciliation above)
    const cards = await cardsCollection
      .find({ ownerAddress: user.walletAddress })
      .sort({ createdAt: -1 })
      .toArray();

    // Only fetch templates that match user's cards (not all templates)
    const uniqueTemplateIds = [...new Set(cards.map((c) => c.templateId))];
    const templates = uniqueTemplateIds.length > 0
      ? await templatesCollection.find({ templateId: { $in: uniqueTemplateIds } }).toArray()
      : [];
    const templateMap = new Map(templates.map((t) => [t.templateId, t]));

    const enrichedCards = cards.map((card) => {
      const template = templateMap.get(card.templateId);
      return {
        cardId: card.cardId || null,
        tokenId: card.tokenId,
        templateId: card.templateId,
        rarity: card.rarity,
        displayStatus: getDisplayStatus(card.fulfillmentStatus, card.status),
        artworkUrl: template?.artworkUrl || "",
        templateName: template?.name || card.templateId,
        requestedAt: card.fulfillmentStatus ? card.updatedAt || null : null,
        deliveredAt: card.deliveredAt || null,
        claimId: card.claimId || null,
        isNew: !card.viewed,
        isListed: card.isListed || false,
        listingId: card.listingId || null,
        createdAt: card.createdAt || null,
      };
    });

    return NextResponse.json({ cards: enrichedCards });
  } catch (error) {
    console.error("Get cards error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
