import { NextRequest, NextResponse } from "next/server";
import { getCollection, parseObjectId } from "@/lib/mongodb";
import { createListing } from "@/lib/listings";
import { getFVM, getFVMFloor } from "@/lib/fvm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, cardId, price } = body;

    if (!userId || !cardId || typeof price !== "number") {
      return NextResponse.json({ error: "Missing required fields: userId, cardId, price" }, { status: 400 });
    }

    if (price <= 0 || !Number.isInteger(price)) {
      return NextResponse.json({ error: "Price must be a positive integer" }, { status: 400 });
    }

    const cardsCol = await getCollection("cards");
    const card = await cardsCol.findOne({ cardId });
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const usersCol = await getCollection("users");
    const user = await usersCol.findOne({ _id: parseObjectId(userId) });
    if (!user || user.walletAddress !== card.ownerAddress) {
      return NextResponse.json({ error: "You do not own this card" }, { status: 403 });
    }

    if (card.status !== "Digital") {
      return NextResponse.json({ error: "Card must be Digital to list" }, { status: 400 });
    }

    if (card.isListed) {
      return NextResponse.json({ error: "Card is already listed" }, { status: 400 });
    }

    if (card.fulfillmentStatus) {
      return NextResponse.json({ error: "Card with physical print history cannot be listed" }, { status: 400 });
    }

    const fvmResult = await getFVM(card.templateId);
    const floor = getFVMFloor(fvmResult.fvm);
    if (floor !== null && price < floor) {
      return NextResponse.json({
        error: `Price below FVM floor. Minimum: ${floor} Credit (70% of FVM ${fvmResult.fvm})`,
        floor,
        fvm: fvmResult.fvm,
      }, { status: 400 });
    }

    const listing = await createListing({
      cardId: card.cardId,
      tokenId: card.tokenId,
      templateId: card.templateId,
      sellerId: userId,
      sellerWalletAddress: user.walletAddress,
      price,
    });

    await cardsCol.updateOne(
      { cardId },
      { $set: { isListed: true, listingId: listing.listingId } }
    );

    return NextResponse.json({ listing });
  } catch (error) {
    console.error("[marketplace/listings POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get("templateId") || undefined;

    const listingsCol = await getCollection("listings");
    const query: Record<string, unknown> = { status: "active" };
    if (templateId) query.templateId = templateId;

    const listings = await listingsCol
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    const templatesCol = await getCollection("card_templates");
    const templates = await templatesCol.find({}).toArray();
    const templateMap = new Map(templates.map((t) => [t.templateId, t]));

    const enriched = await Promise.all(
      listings.map(async (listing) => {
        const template = templateMap.get(listing.templateId);
        const fvmResult = await getFVM(listing.templateId);
        return {
          ...listing,
          artworkUrl: template?.artworkUrl || null,
          templateName: template?.name || listing.templateId,
          rarity: template?.rarity ?? 0,
          fvm: fvmResult.fvm,
          fvmSource: fvmResult.source,
        };
      })
    );

    return NextResponse.json({ listings: enriched });
  } catch (error) {
    console.error("[marketplace/listings GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
