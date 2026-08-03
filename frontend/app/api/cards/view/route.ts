import { NextResponse } from "next/server";
import { getCollection, parseObjectId } from "@/lib/mongodb";

/**
 * POST /api/cards/view
 * Mark cards as viewed (removes "New" badge).
 * Body: { userId: string, cardIds?: string[] }
 * If cardIds omitted, marks ALL user's cards as viewed.
 */
export async function POST(request: Request) {
  try {
    const { userId, cardIds } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const usersCollection = await getCollection("users");
    const user = await usersCollection.findOne({ _id: parseObjectId(userId) } as Record<string, unknown>);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const cardsCollection = await getCollection("cards");

    const filter: Record<string, unknown> = { ownerAddress: user.walletAddress, viewed: { $ne: true } };
    if (cardIds && cardIds.length > 0) {
      filter.cardId = { $in: cardIds };
    }

    const result = await cardsCollection.updateMany(filter, {
      $set: { viewed: true },
    });

    return NextResponse.json({ modified: result.modifiedCount });
  } catch (error) {
    console.error("Mark cards viewed error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
