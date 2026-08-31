import { NextResponse } from "next/server";
import { getCrystalBalance } from "@/lib/crystal";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const balance = await getCrystalBalance(userId);
    return NextResponse.json({ balance });
  } catch (error) {
    console.error("Get crystal error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
