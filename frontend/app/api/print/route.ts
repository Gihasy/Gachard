import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { requestPrint } from "@/lib/blockchain";
import { generateRedeemCode, hashRedeemCode } from "@/lib/redeem-code";
import { encrypt } from "@/lib/crypto";

export async function POST(request: Request) {
  try {
    const { userId, tokenId } = await request.json();

    // Get user
    const usersCollection = await getCollection("users");
    const user = await usersCollection.findOne({ _id: userId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate redeem code (plaintext TIDAK pernah ke frontend atau on-chain)
    const code = generateRedeemCode();
    const hash = hashRedeemCode(code);

    // Submit requestPrint transaction (async — ADR-018)
    const txHash = await requestPrint(tokenId, hash, user.walletAddress);

    // Simpan transaksi sebagai pending
    const txCollection = await getCollection("transactions");
    const result = await txCollection.insertOne({
      userId: user._id.toString(),
      type: "print",
      tokenId,
      txHash,
      status: "pending",
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

    return NextResponse.json({
      status: "pending",
      txId: result.insertedId.toString(),
      txHash,
      // JANGAN return code ke frontend!
    });
  } catch (error) {
    console.error("Print error:", error);
    return NextResponse.json({ error: "Print failed" }, { status: 500 });
  }
}
