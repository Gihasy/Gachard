import { NextResponse } from "next/server";
import { getTransactionStatus, confirmTransaction } from "@/lib/transactions";
import { getCollection, parseObjectId } from "@/lib/mongodb";
import { generateInvoiceId } from "@/lib/invoice";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const txId = searchParams.get("txId");
    const userId = searchParams.get("userId");

    // User transactions list
    if (userId) {
      const usersCollection = await getCollection("users");
      const user = await usersCollection.findOne({ _id: parseObjectId(userId) } as Record<string, unknown>);
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const txCollection = await getCollection("transactions");
      const cardsCollection = await getCollection("cards");

      const txs = await txCollection
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();

      // Build tokenId → cardId map
      const allCards = await cardsCollection.find({}).toArray();
      const tokenIdToCardId = new Map<string, string>();
      for (const card of allCards) {
        if (card.tokenId && card.cardId) {
          tokenIdToCardId.set(String(card.tokenId), card.cardId);
        }
      }

      const formatted = txs.map((tx) => {
        // Resolve cardIds for mint transactions (tokenIds array)
        let cardIds: string[] | null = null;
        if (tx.tokenIds && Array.isArray(tx.tokenIds)) {
          cardIds = tx.tokenIds
            .map((tid: number) => tokenIdToCardId.get(String(tid)) || null)
            .filter(Boolean) as string[];
        }

        // Resolve cardId for single tokenId
        const cardId = tx.tokenId ? tokenIdToCardId.get(String(tx.tokenId)) || null : null;

        return {
          id: generateInvoiceId(tx._id.toString()),
          type: tx.type,
          tokenId: tx.tokenId ?? null,
          cardId,
          tokenIds: tx.tokenIds ?? null,
          cardIds,
          status: tx.status === "confirmed" ? "Success" : tx.status === "failed" ? "Failed" : "Processing",
          amount: tx.amount ?? null,
          createdAt: tx.createdAt,
        };
      });

      return NextResponse.json({ transactions: formatted });
    }

    // Single transaction status
    if (!txId) {
      return NextResponse.json(
        { error: "txId or userId parameter is required" },
        { status: 400 }
      );
    }

    let tx = await getTransactionStatus(txId);

    if (!tx) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // If still pending, check on-chain receipt and update
    if (tx.rawStatus === "pending") {
      await confirmTransaction(txId);
      const refreshed = await getTransactionStatus(txId);
      if (refreshed) {
        tx = refreshed;
      }
    }

    const { rawId: _ri, rawStatus: _rs, ...safe } = tx;
    return NextResponse.json(safe);
  } catch (error) {
    console.error("Transaction status error:", error);
    return NextResponse.json(
      { error: "Failed to get transaction status" },
      { status: 500 }
    );
  }
}
