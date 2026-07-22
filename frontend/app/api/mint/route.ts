import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { mintCard } from "@/lib/blockchain";
import { pickRarity } from "@/lib/odds";
import { pickCardTemplate, seedCardTemplates } from "@/lib/card-templates";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    // Get user from DB
    const usersCollection = await getCollection("users");
    const user = await usersCollection.findOne({ _id: userId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Seed card templates if needed
    await seedCardTemplates();

    // Weighted random pick rarity SEBELUM mint (ADR-009: odds di backend)
    const rarity = await pickRarity();

    // Pick card template for this rarity
    const template = await pickCardTemplate(rarity);

    // Submit mint transaction (async — tidak tunggu konfirmasi, ADR-018)
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
      template: {
        templateId: template.templateId,
        name: template.name,
      },
    });
  } catch (error) {
    console.error("Mint error:", error);
    return NextResponse.json(
      { error: "Mint failed" },
      { status: 500 }
    );
  }
}
