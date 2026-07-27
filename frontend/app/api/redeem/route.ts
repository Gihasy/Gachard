import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { redeemCard, getProvider } from "@/lib/blockchain";
import { hashRedeemCode } from "@/lib/redeem-code";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateInvoiceId } from "@/lib/invoice";
import { friendlyTxStatus } from "@/lib/status-map";
import { confirmTransaction } from "@/lib/transactions";

export async function POST(request: Request) {
  try {
    const { userId, tokenId, code } = await request.json();

    // Get user
    const usersCollection = await getCollection("users");
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) } as Record<string, unknown>);
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

    // Tunggu transaksi terkonfirmasi on-chain
    const txIdStr = result.insertedId.toString();
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

    return NextResponse.json({
      status: friendlyTxStatus(finalStatus),
      txId: generateInvoiceId(txIdStr),
      rateLimitRemaining: rateLimit.remaining,
    });
  } catch (error) {
    console.error("Redeem error:", error);
    return NextResponse.json({ error: "Redeem failed" }, { status: 500 });
  }
}
