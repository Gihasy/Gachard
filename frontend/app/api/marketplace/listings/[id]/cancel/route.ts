import { NextRequest, NextResponse } from "next/server";
import { getListingById, cancelListing } from "@/lib/listings";
import { getCollection } from "@/lib/mongodb";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const listing = await getListingById(id);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (listing.sellerId !== userId) {
      return NextResponse.json({ error: "Only the seller can cancel" }, { status: 403 });
    }

    if (listing.status !== "active") {
      return NextResponse.json({ error: "Listing is not active" }, { status: 400 });
    }

    const success = await cancelListing(id, userId);
    if (!success) {
      return NextResponse.json({ error: "Failed to cancel listing" }, { status: 500 });
    }

    const cardsCol = await getCollection("cards");
    await cardsCol.updateOne(
      { cardId: listing.cardId },
      { $set: { isListed: false }, $unset: { listingId: "" } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[marketplace/cancel]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
