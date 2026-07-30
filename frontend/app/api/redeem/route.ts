import { NextResponse } from "next/server";
import { getCollection, parseObjectId } from "@/lib/mongodb";
import { redeemCard } from "@/lib/blockchain";
import { hashRedeemCode } from "@/lib/redeem-code";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateInvoiceId } from "@/lib/invoice";
import { friendlyTxStatus } from "@/lib/status-map";

export async function POST(request: Request) {
  try {
    const { userId, cardId, tokenId, code } = await request.json();

    // Get user
    const usersCollection = await getCollection("users");
    const user = await usersCollection.findOne({ _id: parseObjectId(userId) } as Record<string, unknown>);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find card by cardId or tokenId
    const cardsCollection = await getCollection("cards");
    let card = null;
    if (cardId) {
      card = await cardsCollection.findOne({ cardId: cardId.toLowerCase() });
    } else if (tokenId) {
      card = await cardsCollection.findOne({ tokenId });
    }
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    if (card.fulfillmentStatus !== "Real") {
      return NextResponse.json(
        { error: "Card must be claimed (status: Real) before redeeming. Please claim shipping first." },
        { status: 400 }
      );
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
    const txHash = await redeemCard(card.tokenId, redeemHash, user.walletAddress);

    // Simpan transaksi sebagai pending
    const contractAddress = process.env.CONTRACT_ADDRESS!;
    const txCollection = await getCollection("transactions");
    const result = await txCollection.insertOne({
      userId: user._id.toString(),
      type: "redeem",
      tokenId: card.tokenId,
      txHash,
      status: "pending",
      contractAddress,
      fromAddress: "vault",
      toAddress: user.walletAddress,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Return immediately — frontend polls /api/transactions for confirmation (ADR-018)
    return NextResponse.json({
      status: friendlyTxStatus("pending"),
      txId: generateInvoiceId(result.insertedId.toString()),
      rateLimitRemaining: rateLimit.remaining,
    });
  } catch (error) {
    console.error("Redeem error:", error);
    return NextResponse.json({ error: "Redeem failed" }, { status: 500 });
  }
}
