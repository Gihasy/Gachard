import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { mintBatch, getProvider } from "@/lib/blockchain";
import { buildPackRarities } from "@/lib/odds";
import { pickCardTemplate, seedCardTemplates } from "@/lib/card-templates";
import { deductCredits, addCredits } from "@/lib/credits";
import { generateInvoiceId } from "@/lib/invoice";
import { friendlyTxStatus } from "@/lib/status-map";
import { confirmTransaction } from "@/lib/transactions";

const PACK_PRICE_CENTS = 500; // 500 Credit per pack

export async function POST(request: Request) {
  const { userId } = await request.json();

  // Get user from DB
  const usersCollection = await getCollection("users");
  const user = await usersCollection.findOne({ _id: new ObjectId(userId) } as Record<string, unknown>);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Deduct credit FIRST
  let newBalance: number;
  try {
    newBalance = await deductCredits(userId, PACK_PRICE_CENTS);
  } catch {
    return NextResponse.json(
      { error: "Insufficient credit balance", price: PACK_PRICE_CENTS },
      { status: 402 }
    );
  }

  // Bungkus sisa proses — refund jika gagal
  try {
    await seedCardTemplates();

    // Build 8 rarities (7 random + 1 guaranteed Rare+)
    const rarities = await buildPackRarities();

    // Pick template untuk setiap kartu
    const templates = [];
    for (const rarity of rarities) {
      templates.push(await pickCardTemplate(rarity));
    }

    // Mint batch — 1 tx untuk seluruh pack (atomik)
    const txHash = await mintBatch(user.walletAddress, rarities);

    // Simpan transaksi
    const txCollection = await getCollection("transactions");
    const txResult = await txCollection.insertOne({
      userId: user._id.toString(),
      type: "mint",
      rarities,
      templateIds: templates.map((t) => t.templateId),
      tokenIds: [], // populated saat konfirmasi on-chain
      purchasePrice: PACK_PRICE_CENTS,
      txHash,
      status: "pending",
      fromAddress: process.env.ADMIN_WALLET_ADDRESS,
      toAddress: user.walletAddress,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Simpan 8 card records
    const cardsCollection = await getCollection("cards");
    const cardDocs = templates.map((template, i) => ({
      tokenId: null,
      txId: txResult.insertedId.toString(),
      pickIndex: i,
      templateId: template.templateId,
      rarity: rarities[i],
      ownerAddress: user.walletAddress,
      status: "pending",
      createdAt: new Date().toISOString(),
    }));
    await cardsCollection.insertMany(cardDocs);

    // Tunggu transaksi terkonfirmasi on-chain (poll receipt)
    const txIdStr = txResult.insertedId.toString();
    let finalStatus = "pending";
    try {
      const provider = getProvider();
      for (let i = 0; i < 10; i++) {
        const receipt = await provider.getTransactionReceipt(txHash);
        if (receipt) {
          await confirmTransaction(txIdStr);
          finalStatus = receipt.status === 1 ? "confirmed" : "failed";
          break;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (confirmErr) {
      console.warn("Auto-confirm failed (will retry on next poll):", confirmErr);
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

    return NextResponse.json({
      status: friendlyTxStatus(finalStatus),
      txId: generateInvoiceId(txIdStr),
      cards,
      newBalance,
    });
  } catch (error) {
    // REFUND
    console.error("Mint failed after deduct, refunding:", error);
    let refunded = false;
    try {
      await addCredits(userId, PACK_PRICE_CENTS);
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
