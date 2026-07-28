import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const PRINT_PRICE_CENTS = 1499; // $14.99 Print + Shipping (flat rate)

export async function POST(request: Request) {
  try {
    const { userId, tokenId, shippingAddress } = await request.json();

    if (!userId || tokenId === undefined) {
      return NextResponse.json({ error: "userId and tokenId required" }, { status: 400 });
    }

    // Validate shipping address
    if (!shippingAddress || !shippingAddress.recipientName || !shippingAddress.addressLine1 || !shippingAddress.city || !shippingAddress.postalCode || !shippingAddress.phone) {
      return NextResponse.json({ error: "Shipping address incomplete" }, { status: 400 });
    }

    const usersCollection = await getCollection("users");
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) } as Record<string, unknown>);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Save shipping address
    const shippingCollection = await getCollection("shipping_addresses");
    await shippingCollection.insertOne({
      userId: user._id.toString(),
      tokenId,
      recipientName: shippingAddress.recipientName,
      addressLine1: shippingAddress.addressLine1,
      addressLine2: shippingAddress.addressLine2 || "",
      city: shippingAddress.city,
      postalCode: shippingAddress.postalCode,
      phone: shippingAddress.phone,
      createdAt: new Date().toISOString(),
    });

    // Simulate Stripe checkout (for hackathon demo)
    const paymentRecord = {
      userId: user._id.toString(),
      tokenId,
      amountCents: PRINT_PRICE_CENTS,
      currency: "usd",
      status: "succeeded",
      stripePaymentId: `sim_${Date.now()}`,
      description: "Print + Shipping",
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
