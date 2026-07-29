import { NextResponse } from "next/server";
import { verifyGoogleToken, getOrCreateUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }

    const googleUser = await verifyGoogleToken(token);

    // Get or create user with real custodial wallet
    const user = await getOrCreateUser(googleUser);

    return NextResponse.json({
      user_id: user._id.toString(),
      username: user.username,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 400 });
  }
}
