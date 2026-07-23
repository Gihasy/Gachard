import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { getCardStatus, getCardRarity, getLastOwner } from "@/lib/blockchain";
import { analyzeCardImage } from "@/lib/vision";

const STATUS_LABELS = ["Digital", "Vaulted"];
const RARITY_LABELS = ["Common", "Rare", "Epic", "Legendary"];
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://frontend-rosy-pi-88.vercel.app";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenIdParam = searchParams.get("tokenId");
    const withVision = searchParams.get("vision") === "true";

    if (!tokenIdParam) {
      return NextResponse.json({ error: "tokenId required" }, { status: 400 });
    }

    const tokenId = parseInt(tokenIdParam);
    if (isNaN(tokenId)) {
      return NextResponse.json({ error: "Invalid tokenId" }, { status: 400 });
    }

    // Get on-chain data (with retry)
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

    const mintTx = await txCollection.findOne({
      type: "mint",
      tokenIds: tokenId,
    });

    if (mintTx?.purchasePrice) {
      purchasePrice = mintTx.purchasePrice;
    }

    // Get ownership history
    const history = await txCollection
      .find({
        $or: [{ tokenId }, { tokenIds: tokenId }],
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    // Verification flag
    const verified = statusOnChain !== undefined && card !== null;
    const statusMatch = card
      ? STATUS_LABELS[statusOnChain] === card.status
      : false;

    // AI Vision analysis (if requested and artwork exists)
    let vision = null;
    if (withVision && template?.artworkUrl) {
      const imageUrl = `${BASE_URL}${template.artworkUrl}`;
      vision = await analyzeCardImage(
        imageUrl,
        RARITY_LABELS[rarityOnChain] || "Unknown",
        template.name || card?.templateId || "Unknown"
      );
    }

    // Update verification flag if vision analysis available
    let verificationFlag = verified && statusMatch ? "verified" : "warning";
    if (vision && !vision.matches) {
      verificationFlag = "warning";
    }

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
        flag: verificationFlag,
        vision: vision || null,
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
