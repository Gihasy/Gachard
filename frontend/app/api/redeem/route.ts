import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { redeemCard } from "@/lib/blockchain";
import { getAuthenticatedUser } from "@/lib/session";
import { hashRedeemCode } from "@/lib/redeem-code";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateInvoiceId } from "@/lib/invoice";
import { friendlyTxStatus } from "@/lib/status-map";

export const maxDuration = 15;

export async function POST(request: Request) {
  try {
    const { cardId, tokenId, code } = await request.json();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user._id.toString();

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
    if (card.status === "Burned") {
      return NextResponse.json({ error: "Card has been dismantled and cannot be redeemed." }, { status: 400 });
    }
    if (card.fulfillmentStatus !== "Real") {
      return NextResponse.json(
        { error: "Card must be claimed (status: Physical) before redeeming. Please claim shipping first." },
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

    // Mark redeem code as claimed before on-chain call
    const codesCollection = await getCollection("redeem_codes");
    await codesCollection.updateMany(
      { tokenId: card.tokenId },
      {
        $set: {
          status: "claimed",
          redeemedBy: userId,
          redeemedAt: new Date().toISOString(),
        },
      }
    );

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
      tokenIds: [card.tokenId],
      rarity: card.rarity ?? 0,
      rarities: [card.rarity ?? 0],
      templateIds: [card.templateId],
      txHash,
      status: "pending",
      contractAddress,
      // On-chain, redeemCard() memindahkan token dari pemilik sebelumnya, bukan dari
      // kontrak — kartu tidak pernah dipegang vault (ADR-031).
      fromAddress: card.ownerAddress || "vault",
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
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Redeem error:", errMsg, error);
    return NextResponse.json({ error: `Redeem failed: ${errMsg}` }, { status: 500 });
  }
}
