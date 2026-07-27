import { NextResponse } from "next/server";
import { getTransactionStatus, confirmTransaction } from "@/lib/transactions";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const txId = searchParams.get("txId");

    if (!txId) {
      return NextResponse.json(
        { error: "txId parameter is required" },
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
    // Use rawStatus for internal logic check
    if (tx.rawStatus === "pending") {
      await confirmTransaction(txId);
      const refreshed = await getTransactionStatus(txId);
      if (refreshed) {
        tx = refreshed;
      }
    }

    // Return only client-safe fields (no rawId, no rawStatus)
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
