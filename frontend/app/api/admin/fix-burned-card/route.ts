import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

/**
 * One-time fix: restore burned card status for cards that were dismantled
 * but later overwritten by print route.
 */
export async function POST() {
  try {
    const cardsCollection = await getCollection("cards");

    // Card #47ec6 (tokenId 149) was dismantled then printed — restore to Burned
    const result = await cardsCollection.updateOne(
      { cardId: "47ec6" },
      {
        $set: {
          status: "Burned",
          fulfillmentStatus: null,
          burnedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        $unset: { deliveredAt: "", claimId: "" },
      }
    );

    return NextResponse.json({
      success: true,
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
