import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

// Auto-confirm waits up to 8s for receipt. Total process ~10-12s. Set 15s buffer.
export const maxDuration = 15;
import { getCollection, parseObjectId } from "@/lib/mongodb";
import { mintBatch, waitForReceipt } from "@/lib/blockchain";
import { buildPackRarities } from "@/lib/odds";
import { pickCardTemplate, seedCardTemplates, updateArtworkUrls } from "@/lib/card-templates";
import { deductCredits, addCredits } from "@/lib/credits";
import { generateInvoiceId } from "@/lib/invoice";
import { friendlyTxStatus } from "@/lib/status-map";
import { ethers } from "ethers";

/** Generate a unique 5-character hex Card ID (e.g. "a3f1b"), with collision retry */
async function generateUniqueCardId(cardsCollection: { findOne: (q: Record<string, unknown>) => Promise<unknown> }): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const id = randomBytes(3).toString("hex").slice(0, 5);
    const existing = await cardsCollection.findOne({ cardId: id });
    if (!existing) return id;
  }
  throw new Error("Failed to generate unique cardId after 5 attempts");
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
    await updateArtworkUrls();

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
    const cardDocs = [];
    for (let i = 0; i < templates.length; i++) {
      cardDocs.push({
        cardId: await generateUniqueCardId(cardsCollection),
        tokenId: null,
        txId: txResult.insertedId.toString(),
        pickIndex: i,
        templateId: templates[i].templateId,
        rarity: rarities[i],
      ownerAddress: user.walletAddress,
      status: "pending",
      contractAddress,
      viewed: false,
      createdAt: new Date().toISOString(),
      });
    }
    await cardsCollection.insertMany(cardDocs);

    // Poll for receipt with retries (up to ~6s, within 15s maxDuration)
    let confirmedTokenIds: number[] = [];
    const receipt = await waitForReceipt(txHash, 3, 1000);
    if (receipt && receipt.status === 1) {
      const CARD_MINTED_TOPIC = ethers.id("CardMinted(uint256,address,uint8,uint8)");
      let mintIndex = 0;
      for (const log of receipt.logs) {
        if (log.topics[0] === CARD_MINTED_TOPIC && log.address.toLowerCase() === contractAddress.toLowerCase()) {
          const tokenId = parseInt(log.topics[1], 16);
          const logData = log.data.slice(2);
          const rarity = parseInt(logData.slice(64, 128), 16);
          confirmedTokenIds.push(tokenId);

          await cardsCollection.updateOne(
            { txId: txResult.insertedId.toString(), pickIndex: mintIndex },
            { $set: { tokenId, status: "Digital", rarity, lastOnChainSync: new Date().toISOString() } }
          );
          mintIndex++;
        }
      }

      if (confirmedTokenIds.length > 0) {
        await txCollection.updateOne(
          { _id: txResult.insertedId },
          { $set: { status: "confirmed", tokenIds: confirmedTokenIds } }
        );
      }
    }

    // Build response array
    const cards = templates.map((template, i) => ({
      rarity: rarities[i],
      template: {
        templateId: template.templateId,
        name: template.name,
        artworkUrl: template.artworkUrl,
      },
    }));

    const finalStatus = confirmedTokenIds.length > 0 ? "confirmed" : "pending";

    return NextResponse.json({
      status: friendlyTxStatus(finalStatus),
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
