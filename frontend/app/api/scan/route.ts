import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { friendlyTxStatus, friendlyCardStatus } from "@/lib/status-map";

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

    // Lookup semua address unik untuk resolve username
    const usersCollection = await getCollection("users");
    const allAddresses = new Set<string>();
    if (card.ownerAddress) allAddresses.add(card.ownerAddress.toLowerCase());
    for (const tx of history) {
      if (tx.fromAddress && tx.fromAddress !== "vault") allAddresses.add(tx.fromAddress.toLowerCase());
      if (tx.toAddress && tx.toAddress !== "vault") allAddresses.add(tx.toAddress.toLowerCase());
    }

    const addressToUsername = new Map<string, string>();
    if (allAddresses.size > 0) {
      const allUsers = await usersCollection.find({}).toArray();
      for (const u of allUsers) {
        if (u.walletAddress) {
          addressToUsername.set(u.walletAddress.toLowerCase(), `@${u.username}`);
        }
      }
    }

    // Data on-chain dari cache (diupdate saat transaksi dikonfirmasi)
    const statusCode = (card.status === "Vaulted" || card.status === "Real") ? 1 : 0;
    const rarityCode = card.rarity ?? 0;
    const ownerAddress = card.ownerAddress || null;
    const ownerName = ownerAddress
      ? addressToUsername.get(ownerAddress.toLowerCase()) || null
      : null;
    const lastSync = card.lastOnChainSync || null;

    // Verification flag — cek apakah cache masih fresh (< 1 jam)
    const cacheAge = lastSync
      ? Date.now() - new Date(lastSync).getTime()
      : Infinity;
    const cacheFresh = cacheAge < 3600000; // 1 jam

    const verified = cacheFresh && card.status !== undefined;
    const statusMatch = STATUS_LABELS[statusCode] === card.status || card.status === "Real";
    const verificationFlag = verified && statusMatch ? "verified" : "warning";

    return NextResponse.json({
      tokenId,
      onChain: {
        status: card.status === "Real" ? "Real" : friendlyCardStatus(STATUS_LABELS[statusCode] || "Unknown"),
        statusCode,
        rarity: RARITY_LABELS[rarityCode] || "Unknown",
        rarityCode,
        lastOwner: ownerName,
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
      },
      history: history.map((tx) => ({
        type: tx.type,
        status: friendlyTxStatus(tx.status),
        from: tx.fromAddress === "vault" ? "Gachard Vault" : tx.fromAddress?.toLowerCase() === process.env.ADMIN_WALLET_ADDRESS?.toLowerCase() ? "Gachard" : addressToUsername.get(tx.fromAddress?.toLowerCase()) || tx.fromAddress,
        to: tx.toAddress === "vault" ? "Gachard Vault" : tx.toAddress?.toLowerCase() === process.env.ADMIN_WALLET_ADDRESS?.toLowerCase() ? "Gachard" : addressToUsername.get(tx.toAddress?.toLowerCase()) || tx.toAddress,
        timestamp: tx.createdAt,
      })),
    });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
