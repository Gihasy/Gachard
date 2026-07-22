import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { redeemCard } from "@/lib/blockchain";
import { hashRedeemCode } from "@/lib/redeem-code";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const { userId, tokenId, code } = await request.json();

    // Get user
    const usersCollection = await getCollection("users");
    const user = await usersCollection.findOne({ _id: userId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // CEK RATE-LIMIT (ADR-006) — TOLAK sebelum transaksi on-chain
    const rateLimit = await checkRateLimit(user._id.toString(), "redeem");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later.", remaining: 0 },
        { status: 429 }
      );
    }

    // Hash code yang dimasukkan user
    const redeemHash = hashRedeemCode(code);

    // Submit redeemCard transaction (async — ADR-018)
    // recipientAddress = wallet user yang login (ADR-007)
    const txHash = await redeemCard(tokenId, redeemHash, user.walletAddress);

    // Simpan transaksi sebagai pending
    const txCollection = await getCollection("transactions");
    const result = await txCollection.insertOne({
      userId: user._id.toString(),
      type: "redeem",
      tokenId,
      txHash,
      status: "pending",
      fromAddress: "vault",
      toAddress: user.walletAddress,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      status: "pending",
      txId: result.insertedId.toString(),
      txHash,
      rateLimitRemaining: rateLimit.remaining,
    });
  } catch (error) {
    console.error("Redeem error:", error);
    return NextResponse.json({ error: "Redeem failed" }, { status: 500 });
  }
}
