import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
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

    // Baca dari cache MongoDB (diupdate saat confirmTransaction)
    const cardsCollection = await getCollection("cards");
    const card = await cardsCollection.findOne({ tokenId });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Ambil data template
    let template = null;
    if (card.templateId) {
      const templatesCollection = await getCollection("card_templates");
      template = await templatesCollection.findOne({ templateId: card.templateId });
    }

    // Ambil purchase price dari mint transaction
    const txCollection = await getCollection("transactions");
    let purchasePrice: number | null = null;

    const mintTx = await txCollection.findOne({
      type: "mint",
      tokenIds: tokenId,
    });

    if (mintTx?.purchasePrice) {
      purchasePrice = mintTx.purchasePrice;
    }

    // Ambil ownership history
    const history = await txCollection
      .find({
        $or: [{ tokenId }, { tokenIds: tokenId }],
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    // Data on-chain dari cache (diupdate saat transaksi dikonfirmasi)
    const statusCode = card.status === "Vaulted" ? 1 : 0;
    const rarityCode = card.rarity ?? 0;
    const lastOwnerAddress = card.lastOwner || null;
    const lastSync = card.lastOnChainSync || null;

    // Verification flag — cek apakah cache masih fresh (< 1 jam)
    const cacheAge = lastSync
      ? Date.now() - new Date(lastSync).getTime()
      : Infinity;
    const cacheFresh = cacheAge < 3600000; // 1 jam

    const verified = cacheFresh && card.status !== undefined;
    const statusMatch = STATUS_LABELS[statusCode] === card.status;

    // AI Vision analysis (opsional)
    let vision = null;
    if (withVision && template?.artworkUrl) {
      const imageUrl = `${BASE_URL}${template.artworkUrl}`;
      vision = await analyzeCardImage(
        imageUrl,
        RARITY_LABELS[rarityCode] || "Unknown",
        template.name || card.templateId || "Unknown"
      );
    }

    // Update verification flag jika vision gagal
    let verificationFlag = verified && statusMatch ? "verified" : "warning";
    if (vision && !vision.matches) {
      verificationFlag = "warning";
    }

    return NextResponse.json({
      tokenId,
      onChain: {
        status: STATUS_LABELS[statusCode] || "Unknown",
        statusCode,
        rarity: RARITY_LABELS[rarityCode] || "Unknown",
        rarityCode,
        lastOwner: lastOwnerAddress,
        lastSync,
      },
      metadata: {
        templateId: card.templateId || null,
        templateName: template?.name || card.templateId || null,
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
