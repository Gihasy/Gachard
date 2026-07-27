import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { generateInvoiceId } from "@/lib/invoice";
import { friendlyTxStatus } from "@/lib/status-map";

export async function GET() {
  try {
    const txCollection = await getCollection("transactions");
    const txs = await txCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    // Enrich with credit balance lookup for mint transactions
    const usersCollection = await getCollection("users");

    const result = await Promise.all(
      txs.map(async (tx) => {
        let creditBalance: number | null = null;
        if (tx.type === "mint" && tx.userId) {
          const user = await usersCollection.findOne({ _id: new (await import("mongodb").then(m => m.ObjectId))(tx.userId) } as Record<string, unknown>);
          if (user?.creditBalance !== undefined) {
            creditBalance = user.creditBalance;
          }
        }

        return {
          id: generateInvoiceId(tx._id.toString()),
          rawId: tx._id.toString(),
          txHash: tx.txHash || null,
          status: friendlyTxStatus(tx.status),
          rawStatus: tx.status,
          type: tx.type,
          tokenId: tx.tokenId ?? null,
          tokenIds: tx.tokenIds ?? null,
          userId: tx.userId,
          fromAddress: tx.fromAddress,
          toAddress: tx.toAddress,
          createdAt: tx.createdAt,
          updatedAt: tx.updatedAt,
          error: tx.error ?? null,
        };
      })
    );

    return NextResponse.json({ transactions: result });
  } catch (error) {
    console.error("Admin transactions error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
