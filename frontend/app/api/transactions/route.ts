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
    if (tx.status === "pending" && tx.txHash) {
      await confirmTransaction(txId);
      tx = await getTransactionStatus(txId);
    }

    return NextResponse.json(tx);
  } catch (error) {
    console.error("Transaction status error:", error);
    return NextResponse.json(
      { error: "Failed to get transaction status" },
      { status: 500 }
    );
  }
}
