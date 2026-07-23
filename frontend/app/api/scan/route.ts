import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { getCardStatus, getCardRarity, getLastOwner } from "@/lib/blockchain";

const STATUS_LABELS = ["Digital", "Vaulted"];
const RARITY_LABELS = ["Common", "Rare", "Epic", "Legendary"];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenIdParam = searchParams.get("tokenId");

    if (!tokenIdParam) {
      return NextResponse.json({ error: "tokenId required" }, { status: 400 });
    }

    const tokenId = parseInt(tokenIdParam);
    if (isNaN(tokenId)) {
      return NextResponse.json({ error: "Invalid tokenId" }, { status: 400 });
    }

    // Get on-chain data
    const [statusOnChain, rarityOnChain, lastOwnerAddress] = await Promise.all([
      getCardStatus(tokenId),
      getCardRarity(tokenId),
      getLastOwner(tokenId),
    ]);

    // Get off-chain data from MongoDB
    const cardsCollection = await getCollection("cards");
    const card = await cardsCollection.findOne({ tokenId });

    let template = null;
    if (card?.templateId) {
      const templatesCollection = await getCollection("card_templates");
      template = await templatesCollection.findOne({ templateId: card.templateId });
    }

    // Get purchase price from mint transaction
    const txCollection = await getCollection("transactions");
    let purchasePrice: number | null = null;

    // Cari transaksi mint yang memiliki tokenId ini di array tokenIds
    const mintTx = await txCollection.findOne({
      type: "mint",
      tokenIds: tokenId,
    });

    if (mintTx?.purchasePrice) {
      purchasePrice = mintTx.purchasePrice;
    }

    // Get ownership history — cari berdasarkan tokenId di field tokenId ATAU tokenIds array
    const history = await txCollection
      .find({
        $or: [
          { tokenId },
          { tokenIds: tokenId },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    // Verification flag
    const verified = statusOnChain !== undefined && card !== null;
    const statusMatch = card
      ? STATUS_LABELS[statusOnChain] === card.status
      : false;

    return NextResponse.json({
      tokenId,
      onChain: {
        status: STATUS_LABELS[statusOnChain] || "Unknown",
        statusCode: statusOnChain,
        rarity: RARITY_LABELS[rarityOnChain] || "Unknown",
        rarityCode: rarityOnChain,
        lastOwner: lastOwnerAddress,
      },
      metadata: {
        templateId: card?.templateId || null,
        templateName: template?.name || card?.templateId || null,
        artworkUrl: template?.artworkUrl || null,
      },
      purchasePrice,
      verification: {
        verified,
        statusMatch,
        flag: verified && statusMatch ? "verified" : "warning",
      },
      history: history.map((tx) => ({
        type: tx.type,
        status: tx.status,
        from: tx.fromAddress,
        to: tx.toAddress,
        timestamp: tx.createdAt,
      })),
    });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
