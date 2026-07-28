import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

const VALID_TRANSITIONS: Record<string, string> = {
  Locked: "Processing",
  Processing: "Printed",
  Printed: "Shipping",
  Shipping: "Real",
};

export async function POST(request: Request) {
  try {
    const { tokenId, action, trackingNumber } = await request.json();

    if (!tokenId || !action) {
      return NextResponse.json({ error: "tokenId and action required" }, { status: 400 });
    }

    const cardsCollection = await getCollection("cards");
    const card = await cardsCollection.findOne({ tokenId });
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const currentStatus = card.fulfillmentStatus;
    const expectedAction = VALID_TRANSITIONS[currentStatus];

    if (!expectedAction || action !== expectedAction) {
      return NextResponse.json(
        { error: `Invalid transition: ${currentStatus} → ${action}` },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {
      fulfillmentStatus: action,
      updatedAt: new Date().toISOString(),
    };

    // Add tracking number if provided (for Shipping status)
    if (action === "Shipping" && trackingNumber) {
      update.trackingNumber = trackingNumber;
    }

    // If status is "Real", also mark as delivered
    if (action === "Real") {
      update.deliveredAt = new Date().toISOString();
    }

    await cardsCollection.updateOne({ tokenId }, { $set: update });

    return NextResponse.json({
      success: true,
      tokenId,
      fulfillmentStatus: action,
    });
  } catch (error) {
    console.error("Fulfillment update error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
