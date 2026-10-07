import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { requestPrint } from "@/lib/blockchain";
import { getAuthenticatedUser } from "@/lib/session";
import { generateRedeemCode, hashRedeemCode } from "@/lib/redeem-code";
import { encrypt } from "@/lib/crypto";
import { generateInvoiceId } from "@/lib/invoice";
import { friendlyTxStatus } from "@/lib/status-map";

export const maxDuration = 15;

export async function POST(request: Request) {
  try {
    const { cardId } = await request.json();
    if (typeof cardId !== "string" || !cardId) {
      return NextResponse.json({ error: "cardId required" }, { status: 400 });
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user._id.toString();

    // Verify card ownership — user hanya bisa print kartu milik sendiri.
    // Cari lewat cardId: tokenId tidak unik lintas deploy kontrak.
    const cardsCollection = await getCollection("cards");
    const card = await cardsCollection.findOne({ cardId: cardId.toLowerCase() });
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    if (card.ownerAddress !== user.walletAddress) {
      return NextResponse.json({ error: "Card does not belong to this user" }, { status: 403 });
    }

    // Block print while card is listed for sale
    if (card.isListed) {
      return NextResponse.json({ error: "Card is listed for sale. Cancel listing before requesting print." }, { status: 400 });
    }

    // Block print if card is burned (dismantled)
    if (card.status === "Burned") {
      return NextResponse.json({ error: "Card has been dismantled and cannot be printed." }, { status: 400 });
    }

    const tokenId: number = card.tokenId;

    // Generate redeem code (plaintext TIDAK pernah ke frontend atau on-chain)
    const code = generateRedeemCode();
    const hash = hashRedeemCode(code);

    // Submit requestPrint transaction
    const txHash = await requestPrint(tokenId, hash, user.walletAddress);

    // Simpan transaksi sebagai pending
    const contractAddress = process.env.CONTRACT_ADDRESS!;
    const txCollection = await getCollection("transactions");
    const result = await txCollection.insertOne({
      userId: user._id.toString(),
      type: "print",
      cardId: card.cardId,
      tokenId,
      tokenIds: [tokenId],
      rarity: card.rarity ?? 0,
      rarities: [card.rarity ?? 0],
      templateIds: [card.templateId],
      txHash,
      status: "pending",
      contractAddress,
      fromAddress: user.walletAddress,
      toAddress: "vault",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Save redeem code and update card status in parallel
    const codesCollection = await getCollection("redeem_codes");
    await Promise.all([
      codesCollection.insertOne({
        cardId: card.cardId,
        tokenId,
        txId: result.insertedId.toString(),
        codeEncrypted: encrypt(code),
        status: "active",
        createdAt: new Date().toISOString(),
      }),
      cardsCollection.updateOne(
        { cardId: card.cardId },
        {
          $set: {
            status: "Vaulted",
            fulfillmentStatus: "Locked",
            updatedAt: new Date().toISOString(),
          },
        }
      ),
    ]);

    // Return with redeem code for frontend to display
    return NextResponse.json({
      status: "Processing",
      txId: generateInvoiceId(result.insertedId.toString()),
      redeemCode: code, // Show to user, will be printed on physical card
    });
  } catch (error) {
    console.error("Print error:", error);
    return NextResponse.json({ error: "Print failed" }, { status: 500 });
  }
}
