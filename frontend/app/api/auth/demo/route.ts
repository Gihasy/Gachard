import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { getCreditBalance, addCredits } from "@/lib/credits";

/**
 * Development / testing demo login.
 *
 * Creates (or reuses) a real custodial-wallet user in MongoDB and grants
 * starter credits so every gated page + function can be exercised WITHOUT
 * configuring Google OAuth. Sets up the same session the app already uses
 * (client stores `user` in localStorage + `gachard_uid` cookie).
 *
 * Gated by the ENABLE_DEMO_LOGIN env flag so it can never be reached in a
 * real production build unless explicitly turned on.
 */
const DEMO_GOOGLE_USER = {
  sub: "demo-user",
  email: "demo@gachard.io",
  name: "CosmicPlayer",
};

export async function POST() {
  if (process.env.ENABLE_DEMO_LOGIN !== "true") {
    return NextResponse.json({ error: "Demo login is disabled" }, { status: 403 });
  }

  try {
    const user = await getOrCreateUser(DEMO_GOOGLE_USER);
    const userId = user._id.toString();

    // Grant a one-time starter balance so packs / topup / redeem can be tested.
    const balance = await getCreditBalance(userId);
    if (balance <= 0) {
      await addCredits(userId, 10000);
    }

    return NextResponse.json({
      user_id: userId,
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    console.error("Demo login error:", error);
    return NextResponse.json({ error: "Demo login failed" }, { status: 500 });
  }
}
