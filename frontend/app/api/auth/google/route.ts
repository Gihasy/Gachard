import { NextResponse } from "next/server";
import { verifyGoogleToken, getOrCreateUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    // Verify Google token (real verification, not mock)
    const googleUser = await verifyGoogleToken(token);

    // Get or create user with real custodial wallet
    const user = await getOrCreateUser(googleUser);

    return NextResponse.json({
      user_id: user._id.toString(),
      username: user.username,
      wallet_address: user.walletAddress,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 400 });
  }
}
