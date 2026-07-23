import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const PRINT_PRICE_CENTS = 999; // $9.99 per print

export async function POST(request: Request) {
  try {
    const { userId, tokenId } = await request.json();

    if (!userId || tokenId === undefined) {
      return NextResponse.json({ error: "userId and tokenId required" }, { status: 400 });
    }

    const usersCollection = await getCollection("users");
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) } as Record<string, unknown>);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Simulate Stripe checkout (for hackathon demo)
    const paymentRecord = {
      userId: user._id.toString(),
      tokenId,
      amountCents: PRINT_PRICE_CENTS,
      currency: "usd",
      status: "succeeded",
      stripePaymentId: `sim_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const paymentsCollection = await getCollection("payments");
    const result = await paymentsCollection.insertOne(paymentRecord);

    return NextResponse.json({
      success: true,
      paymentId: result.insertedId.toString(),
      amount: PRINT_PRICE_CENTS,
    });
  } catch (error) {
    console.error("Print checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
