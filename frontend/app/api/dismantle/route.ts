import { NextResponse } from "next/server";
import { after } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/lib/session";
import { burnCard, waitForReceipt } from "@/lib/blockchain";
import { addCrystal, getDismantleRate } from "@/lib/crystal";
import { generateInvoiceId } from "@/lib/invoice";

export const maxDuration = 15;

const RARITY_NAMES = ["Common", "Rare", "Epic", "Legendary"];

export async function POST(request: Request) {
  try {
    const { cardId, tokenId } = await request.json();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!cardId && tokenId === undefined) {
      return NextResponse.json({ error: "cardId (or tokenId) is required" }, { status: 400 });
    }

    // Read the card first — only to resolve its identity and to produce a
    // specific error message. The authoritative check is the atomic claim below.
    const cardsCollection = await getCollection("cards");
    const card = cardId
      ? await cardsCollection.findOne({ cardId })
      : await cardsCollection.findOne({ tokenId });
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Resolve the canonical identifier from the query result — NOT from request body
    // (cardId from body could be undefined if only tokenId was sent)
    const resolvedCardId = card.cardId ?? card._id.toString();

    const rarity = card.rarity ?? 0;
    const crystalReward = getDismantleRate(rarity);
    if (crystalReward === 0) {
      return NextResponse.json({ error: "Invalid card rarity" }, { status: 400 });
    }

    // Claim the card atomically BEFORE touching the chain.
    //
    // Checking the card's state and then writing "Burned" after the on-chain
    // submit used to leave a window of several hundred ms (the submit itself) in
    // which a concurrent mint-confirmation pass could write the card back to
    // "Digital" — the card stayed visible in Collection even though its token was
    // burned and Crystal had been paid out. Claiming first closes that window:
    // once the status is "Burned", every other writer's `$ne: "Burned"` guard
    // (ADR-028) applies. It also makes a double dismantle of the same card
    // impossible, since only one claim can match `status: "Digital"`.
    const claimedAt = new Date().toISOString();
    const claimed = await cardsCollection.findOneAndUpdate(
      {
        cardId: resolvedCardId,
        ownerAddress: user.walletAddress,
        status: "Digital",
        isListed: { $ne: true },
        $or: [{ fulfillmentStatus: null }, { fulfillmentStatus: { $exists: false } }],
      },
      {
        $set: {
          status: "Burned",
          burnedAt: claimedAt,
          crystalReward,
          updatedAt: claimedAt,
        },
      },
      { returnDocument: "after" }
    );

    if (!claimed) {
      // Claim failed — explain why, using the copy we read above.
      if (card.ownerAddress !== user.walletAddress) {
        return NextResponse.json({ error: "Card does not belong to this user" }, { status: 403 });
      }
      if (card.isListed) {
        return NextResponse.json(
          { error: "Card is listed for sale. Cancel listing before dismantling." },
          { status: 400 }
        );
      }
      if (card.fulfillmentStatus) {
        return NextResponse.json(
          { error: "Card is in fulfillment process and cannot be dismantled" },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: "Only Digital cards can be dismantled" }, { status: 400 });
    }

    // Undo the claim if the card never actually makes it onto the chain.
    const releaseClaim = async () => {
      await cardsCollection.updateOne(
        { cardId: resolvedCardId, status: "Burned", burnedAt: claimedAt },
        {
          $set: { status: "Digital", updatedAt: new Date().toISOString() },
          $unset: { burnedAt: "", crystalReward: "" },
        }
      );
    };

    // Burn on-chain
    let txHash: string;
    try {
      txHash = await burnCard(card.tokenId, user.walletAddress);
    } catch (err) {
      await releaseClaim();
      console.error("[dismantle] burn submit failed, claim released:", err);
      return NextResponse.json({ error: "Dismantle failed" }, { status: 500 });
    }

    // Record transaction as pending
    const contractAddress = process.env.CONTRACT_ADDRESS!;
    const txCollection = await getCollection("transactions");
    const txResult = await txCollection.insertOne({
      userId: user._id.toString(),
      type: "dismantled",
      cardId: resolvedCardId,
      tokenId: card.tokenId,
      tokenIds: [card.tokenId],
      rarity,
      rarities: [rarity],
      templateIds: [card.templateId],
      txHash,
      status: "pending",
      contractAddress,
      fromAddress: user.walletAddress,
      toAddress: "0x0000000000000000000000000000000000000000",
      amount: crystalReward,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const [, newBalance] = await Promise.all([
      cardsCollection.updateOne(
        { cardId: resolvedCardId },
        { $set: { dismantleTxId: txResult.insertedId.toString() } }
      ),
      addCrystal(user._id.toString(), crystalReward),
    ]);

    // Background: wait for on-chain receipt and confirm transaction
    // Uses after() from next/server — same pattern as marketplace buy route
    // Response returns immediately with "pending" status
    after(async () => {
      try {
        const receipt = await waitForReceipt(txHash);
        if (receipt && receipt.status === 1) {
          await txCollection.updateOne(
            { _id: txResult.insertedId },
            { $set: { status: "confirmed", updatedAt: new Date().toISOString() } }
          );
        } else {
          await txCollection.updateOne(
            { _id: txResult.insertedId },
            { $set: { status: "failed", error: "On-chain transaction failed or timed out", updatedAt: new Date().toISOString() } }
          );
        }
      } catch (err) {
        console.error("[dismantle] background receipt confirmation failed:", err);
      }
    });

    return NextResponse.json({
      status: "pending",
      txId: generateInvoiceId(txResult.insertedId.toString()),
      crystalReward,
      crystalBalance: newBalance,
      rarity: RARITY_NAMES[rarity],
    });
  } catch (error) {
    console.error("Dismantle error:", error);
    return NextResponse.json({ error: "Dismantle failed" }, { status: 500 });
  }
}
