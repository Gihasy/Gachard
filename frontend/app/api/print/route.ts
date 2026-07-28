import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { requestPrint } from "@/lib/blockchain";
import { generateRedeemCode, hashRedeemCode } from "@/lib/redeem-code";
import { encrypt } from "@/lib/crypto";
import { generateInvoiceId } from "@/lib/invoice";
import { friendlyTxStatus } from "@/lib/status-map";

export async function POST(request: Request) {
  try {
    const { userId, tokenId } = await request.json();

    // Get user
    const usersCollection = await getCollection("users");
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) } as Record<string, unknown>);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate redeem code (plaintext TIDAK pernah ke frontend atau on-chain)
    const code = generateRedeemCode();
    const hash = hashRedeemCode(code);

    // Submit requestPrint transaction (async — ADR-018)
    const txHash = await requestPrint(tokenId, hash, user.walletAddress);

    // Simpan transaksi sebagai pending
    const contractAddress = process.env.CONTRACT_ADDRESS!;
    const txCollection = await getCollection("transactions");
    const result = await txCollection.insertOne({
      userId: user._id.toString(),
      type: "print",
      tokenId,
      txHash,
      status: "pending",
      contractAddress,
      fromAddress: user.walletAddress,
      toAddress: "vault",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Simpan redeem code TERENKRIPSI untuk cetak fisik nanti
    const codesCollection = await getCollection("redeem_codes");
    await codesCollection.insertOne({
      tokenId,
      txId: result.insertedId.toString(),
      codeEncrypted: encrypt(code),
      status: "active", // active → used → expired
      createdAt: new Date().toISOString(),
    });

    // Set card status ke Vaulted dan fulfillmentStatus ke "Locked"
    const cardsCollection = await getCollection("cards");
    await cardsCollection.updateOne(
      { tokenId },
      {
        $set: {
          status: "Vaulted",
          fulfillmentStatus: "Locked",
          updatedAt: new Date().toISOString(),
        },
      }
    );

    // Return immediately — frontend polls /api/transactions for confirmation (ADR-018)
    return NextResponse.json({
      status: friendlyTxStatus("pending"),
      txId: generateInvoiceId(result.insertedId.toString()),
    });
  } catch (error) {
    console.error("Print error:", error);
    return NextResponse.json({ error: "Print failed" }, { status: 500 });
  }
}
