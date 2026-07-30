import { NextResponse } from "next/server";
import { getCollection, parseObjectId } from "@/lib/mongodb";

/**
 * POST /api/claim-shipping
 * User claims a shipped card by scanning the claim QR code.
 * Body: { userId, claimId }
 * 
 * Flow:
 * 1. Verify user exists
 * 2. Find card by claimId
 * 3. Verify card belongs to user
 * 4. Update card status to "Real"
 */
export async function POST(request: Request) {
  try {
    const { userId, claimId } = await request.json();

    if (!userId || !claimId) {
      return NextResponse.json({ error: "userId and claimId required" }, { status: 400 });
    }

    // Get user
    const usersCollection = await getCollection("users");
    const user = await usersCollection.findOne({ _id: parseObjectId(userId) } as Record<string, unknown>);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find card by claimId
    const cardsCollection = await getCollection("cards");
    const card = await cardsCollection.findOne({ claimId });
    if (!card) {
      return NextResponse.json({ error: "Invalid claim code" }, { status: 404 });
    }

    // Verify card belongs to user
    if (card.ownerAddress !== user.walletAddress) {
      return NextResponse.json({ error: "Card does not belong to this user" }, { status: 403 });
    }

    // Verify card is in Shipping status
    if (card.fulfillmentStatus !== "Shipping") {
      return NextResponse.json(
        { error: `Card is not in Shipping status (current: ${card.fulfillmentStatus || "Digital"})` },
        { status: 400 }
      );
    }

    // Update card to Real
    await cardsCollection.updateOne(
      { claimId },
      {
        $set: {
          status: "Real",
          fulfillmentStatus: "Real",
          deliveredAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        $unset: { claimId: "" },
      }
    );

    return NextResponse.json({
      success: true,
      tokenId: card.tokenId,
      cardId: card.cardId,
      status: "Real",
    });
  } catch (error) {
    console.error("Claim shipping error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
