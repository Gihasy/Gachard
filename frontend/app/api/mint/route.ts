import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCollection, parseObjectId } from "@/lib/mongodb";
import { mintBatch } from "@/lib/blockchain";
import { buildPackRarities } from "@/lib/odds";
import { pickCardTemplate, seedCardTemplates } from "@/lib/card-templates";
import { deductCredits, addCredits } from "@/lib/credits";
import { generateInvoiceId } from "@/lib/invoice";
import { friendlyTxStatus } from "@/lib/status-map";

/** Generate a unique 5-character hex Card ID (e.g. "a3f1b") */
function generateCardId(): string {
  return randomBytes(3).toString("hex").slice(0, 5);
}

const PACK_TYPES: Record<string, { price: number; cards: number; guaranteed: number }> = {
  standard: { price: 500, cards: 5, guaranteed: 1 },
  booster: { price: 800, cards: 10, guaranteed: 2 },
};

export async function POST(request: Request) {
  const { userId, packType = "standard" } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const pack = PACK_TYPES[packType];
  if (!pack) {
    return NextResponse.json(
      { error: "Invalid pack type. Use 'standard' or 'booster'." },
      { status: 400 }
    );
  }

  // Get user from DB
  const usersCollection = await getCollection("users");
  const user = await usersCollection.findOne({ _id: parseObjectId(userId) } as Record<string, unknown>);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Deduct credit FIRST
  let newBalance: number;
  try {
    newBalance = await deductCredits(userId, pack.price);
  } catch {
    return NextResponse.json(
      { error: "Insufficient credit balance", price: pack.price },
      { status: 402 }
    );
  }

  // Bungkus sisa proses — refund jika gagal
  try {
    await seedCardTemplates();

    // Build rarities based on pack type
    const rarities = await buildPackRarities(pack.cards, pack.guaranteed);

    // Pick template untuk setiap kartu
    const templates = [];
    for (const rarity of rarities) {
      templates.push(await pickCardTemplate(rarity));
    }

    // Mint batch — 1 tx untuk seluruh pack (atomik)
    const txHash = await mintBatch(user.walletAddress, rarities);

    // Simpan transaksi
    const contractAddress = process.env.CONTRACT_ADDRESS!;
    const txCollection = await getCollection("transactions");
    const txResult = await txCollection.insertOne({
      userId: user._id.toString(),
      type: "mint",
      amount: pack.price,
      rarities,
      templateIds: templates.map((t) => t.templateId),
      tokenIds: [], // populated saat konfirmasi on-chain
      purchasePrice: pack.price,
      txHash,
      status: "pending",
      contractAddress,
      fromAddress: process.env.ADMIN_WALLET_ADDRESS,
      toAddress: user.walletAddress,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Simpan card records
    const cardsCollection = await getCollection("cards");
    const cardDocs = templates.map((template, i) => ({
      cardId: generateCardId(),
      tokenId: null,
      txId: txResult.insertedId.toString(),
      pickIndex: i,
      templateId: template.templateId,
      rarity: rarities[i],
      ownerAddress: user.walletAddress,
      status: "pending",
      contractAddress,
      createdAt: new Date().toISOString(),
    }));
    await cardsCollection.insertMany(cardDocs);

    // Build response array
    const cards = templates.map((template, i) => ({
      rarity: rarities[i],
      template: {
        templateId: template.templateId,
        name: template.name,
        artworkUrl: template.artworkUrl,
      },
    }));

    return NextResponse.json({
      status: friendlyTxStatus("pending"),
      txId: generateInvoiceId(txResult.insertedId.toString()),
      cards,
      newBalance,
    });
  } catch (error) {
    // REFUND
    console.error("Mint failed after deduct, refunding:", error);
    let refunded = false;
    try {
      await addCredits(userId, pack.price);
      refunded = true;
    } catch (refundError) {
      console.error("CRITICAL: Refund failed:", refundError);
    }

    const message = refunded
      ? "Mint failed, credit refunded"
      : "Mint failed, credit refund FAILED — contact support";

    return NextResponse.json({ error: message, refunded }, { status: 500 });
  }
}
