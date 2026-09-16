import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

/**
 * Repair: find all cards with a dismantle transaction but status != "Burned",
 * and restore their status to "Burned".
 *
 * A card can end up in this state when a reconciliation pass (confirmMint /
 * confirmTransaction) re-applies a stale pending mint/print/redeem receipt over
 * a card that was dismantled afterwards. Those writes are now guarded with
 * `status: { $ne: "Burned" }`, so this endpoint only repairs historical damage.
 *
 * Matching prefers `tx.cardId` (recorded since the dismantle route was fixed).
 * Older dismantle transactions only carry tokenId, which is NOT unique across
 * the contracts this project has redeployed — those fall back to matching on
 * tokenId + contractAddress to avoid burning an unrelated card from an older
 * contract that happens to share the same tokenId.
 */
export async function POST() {
  try {
    const cardsCollection = await getCollection("cards");
    const txCollection = await getCollection("transactions");

    const dismantleTxs = await txCollection.find({ type: "dismantled" }).toArray();

    const results: string[] = [];
    const skipped: string[] = [];

    for (const tx of dismantleTxs) {
      let card = tx.cardId ? await cardsCollection.findOne({ cardId: tx.cardId }) : null;

      if (!card) {
        const tokenIds: number[] = tx.tokenIds?.length
          ? tx.tokenIds
          : tx.tokenId != null
            ? [tx.tokenId]
            : [];

        for (const tokenId of tokenIds) {
          const matches = await cardsCollection.find({ tokenId }).toArray();
          if (matches.length === 1) {
            card = matches[0];
          } else if (matches.length > 1 && tx.contractAddress) {
            const scoped = matches.filter(
              (c) =>
                (c.contractAddress || "").toLowerCase() ===
                tx.contractAddress.toLowerCase()
            );
            if (scoped.length === 1) card = scoped[0];
          }
          if (card) break;
          if (matches.length > 1) {
            skipped.push(
              `tokenId ${tokenId}: ${matches.length} ambiguous card docs, cannot resolve safely`
            );
          }
        }
      }

      if (!card || card.status === "Burned") continue;

      await cardsCollection.updateOne(
        { _id: card._id },
        {
          $set: {
            status: "Burned",
            fulfillmentStatus: null,
            burnedAt: card.burnedAt || tx.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          $unset: { deliveredAt: "", claimId: "" },
        }
      );
      results.push(
        `Fixed ${card.cardId} (tokenId ${card.tokenId}): ${card.status} → Burned`
      );
    }

    return NextResponse.json({
      success: true,
      fixed: results.length,
      details: results,
      skipped,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
