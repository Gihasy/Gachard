import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { mintCard } from "@/lib/blockchain";
import { pickRarity } from "@/lib/odds";
import { pickCardTemplate, seedCardTemplates } from "@/lib/card-templates";
import { deductCredits, addCredits } from "@/lib/credits";

const PACK_PRICE_CENTS = 299; // $2.99 per pack

export async function POST(request: Request) {
  const { userId } = await request.json();

  // Get user from DB
  const usersCollection = await getCollection("users");
  const user = await usersCollection.findOne({ _id: new ObjectId(userId) } as Record<string, unknown>);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Deduct credit FIRST (before minting)
  let newBalance: number;
  try {
    newBalance = await deductCredits(userId, PACK_PRICE_CENTS);
  } catch {
    return NextResponse.json(
      { error: "Insufficient credit balance", price: PACK_PRICE_CENTS },
      { status: 402 }
    );
  }

  // Bungkus sisa proses dalam try/catch — refund jika gagal
  try {
    // Seed card templates if needed
    await seedCardTemplates();

    // Weighted random pick rarity (ADR-009: odds di backend)
    const rarity = await pickRarity();

    // Pick card template
    const template = await pickCardTemplate(rarity);

    // Submit mint transaction (async — ADR-018)
    const txHash = await mintCard(user.walletAddress, rarity);

    // Simpan transaksi sebagai pending
    const txCollection = await getCollection("transactions");
    const result = await txCollection.insertOne({
      userId: user._id.toString(),
      type: "mint",
      rarity,
      templateId: template.templateId,
      txHash,
      status: "pending",
      fromAddress: process.env.ADMIN_WALLET_ADDRESS,
      toAddress: user.walletAddress,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Simpan card record (linked ke tokenId on-chain setelah konfirmasi)
    const cardsCollection = await getCollection("cards");
    await cardsCollection.insertOne({
      tokenId: null,
      txId: result.insertedId.toString(),
      templateId: template.templateId,
      rarity,
      ownerAddress: user.walletAddress,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      status: "pending",
      txId: result.insertedId.toString(),
      txHash,
      rarity,
      template: { templateId: template.templateId, name: template.name, artworkUrl: template.artworkUrl },
      newBalance,
    });
  } catch (error) {
    // REFUND: kembalikan saldo jika mint gagal setelah deduct
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
