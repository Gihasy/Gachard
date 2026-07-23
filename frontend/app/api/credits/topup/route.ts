import { NextResponse } from "next/server";
import { addCredits } from "@/lib/credits";

export async function POST(request: Request) {
  try {
    const { userId, amountCents } = await request.json();

    if (!userId || !amountCents) {
      return NextResponse.json({ error: "userId and amountCents required" }, { status: 400 });
    }

    const newBalance = await addCredits(userId, amountCents);
    return NextResponse.json({ success: true, newBalance });
  } catch (error) {
    console.error("Top-up error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
