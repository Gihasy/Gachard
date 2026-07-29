import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getOrCreateUser } from "@/lib/auth";
import { getCreditBalance, addCredits } from "@/lib/credits";

/**
 * Generate a demo / sandbox account.
 *
 * Creates a fresh custodial-wallet user in MongoDB and grants starter credits
 * so anyone can try every gated page + function WITHOUT Google OAuth. Each
 * click spins up an isolated account (unique id) so concurrent testers never
 * collide. Establishes the app's standard session on the client
 * (localStorage `user` + `gachard_uid` cookie).
 *
 * Gated by the ENABLE_DEMO_LOGIN env flag so it can be turned off in a real
 * production build.
 */
export async function POST() {
  if (process.env.ENABLE_DEMO_LOGIN !== "true") {
    return NextResponse.json({ error: "Demo accounts are disabled" }, { status: 403 });
  }

  try {
    const suffix = randomBytes(4).toString("hex");
    const demoUser = {
      sub: `demo-${suffix}`,
      email: `demo-${suffix}@gachard.io`,
      name: `Demo ${suffix}`,
    };

    const user = await getOrCreateUser(demoUser);
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
    console.error("Demo account error:", error);
    return NextResponse.json({ error: "Could not generate demo account" }, { status: 500 });
  }
}
