import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

/**
 * Admin endpoint: accept a print request.
 * Marks the card as "Real" — simulates physical printing with redeem code.
 */
export async function POST(request: Request) {
  try {
    const { tokenId } = await request.json();

    if (!tokenId && tokenId !== 0) {
      return NextResponse.json({ error: "tokenId required" }, { status: 400 });
    }

    const cardsCollection = await getCollection("cards");
    const codesCollection = await getCollection("redeem_codes");

    // Update card status to "Real" — NFT stays in user's wallet
    // Smart contract blocks transfers when status is "Vaulted" (1)
    const cardResult = await cardsCollection.updateOne(
      { tokenId },
      {
        $set: {
          status: "Real",
          printedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }
    );

    // Mark redeem code as accepted
    await codesCollection.updateMany(
      { tokenId },
      {
        $set: {
          status: "accepted",
          acceptedAt: new Date().toISOString(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      tokenId,
      message: `Card #${tokenId} marked as Real. Redeem code printed on physical card.`,
    });
  } catch (error) {
    console.error("Accept print error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
