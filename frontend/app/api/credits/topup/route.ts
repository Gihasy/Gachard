import { NextResponse } from "next/server";
import { addCredits } from "@/lib/credits";
import { createTransaction } from "@/lib/transactions";

export async function POST(request: Request) {
  try {
    const { userId, amountCents } = await request.json();

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    if (!amountCents || typeof amountCents !== "number" || amountCents <= 0 || !Number.isFinite(amountCents)) {
      return NextResponse.json({ error: "amountCents must be a positive number" }, { status: 400 });
    }

    if (amountCents > 100000) {
      return NextResponse.json({ error: "Maximum top-up is $1,000" }, { status: 400 });
    }

    const newBalance = await addCredits(userId, amountCents);

    // Record top-up as a transaction for history tracking
    const tx = await createTransaction({
      userId,
      type: "topup",
      amount: amountCents,
      fromAddress: "",
      toAddress: "",
    });

    return NextResponse.json({ success: true, newBalance, txId: tx._id?.toString() });
  } catch (error) {
    console.error("Top-up error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
