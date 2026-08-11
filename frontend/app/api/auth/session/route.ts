import { NextResponse } from "next/server";
import { getOrCreateUserByEmail, createSession } from "@/lib/auth";

// Emergent-managed OAuth session-data endpoint. The session_id (from the
// #session_id fragment) is exchanged here, server-side only.
const EMERGENT_SESSION_URL =
  "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data";

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

export async function POST(request: Request) {
  try {
    const { session_id } = await request.json();
    if (!session_id || typeof session_id !== "string") {
      return NextResponse.json({ error: "session_id required" }, { status: 400 });
    }

    const emergentRes = await fetch(EMERGENT_SESSION_URL, {
      headers: { "X-Session-ID": session_id },
    });
    if (!emergentRes.ok) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const data = await emergentRes.json();
    if (!data?.email || !data?.session_token) {
      return NextResponse.json({ error: "Invalid session data" }, { status: 401 });
    }

    const user = await getOrCreateUserByEmail({
      email: data.email,
      name: data.name,
      picture: data.picture,
      emergentId: data.id,
    });
    const userId = user._id.toString();

    const expiresAt = new Date(Date.now() + SEVEN_DAYS_SECONDS * 1000);
    await createSession(userId, data.session_token, expiresAt);

    const response = NextResponse.json({
      user_id: userId,
      username: user.username,
      email: user.email,
    });

    // Set cookies via explicit Set-Cookie headers (deterministic — NextResponse
    // .cookies.set can coalesce/drop entries when mixing SameSite=None + Lax).
    response.headers.append(
      "Set-Cookie",
      `session_token=${data.session_token}; Path=/; Max-Age=${SEVEN_DAYS_SECONDS}; HttpOnly; Secure; SameSite=None`
    );
    response.headers.append(
      "Set-Cookie",
      `gachard_uid=${userId}; Path=/; Max-Age=${SEVEN_DAYS_SECONDS}; Secure; SameSite=Lax`
    );

    return response;
  } catch (error) {
    console.error("Auth session error:", error);
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}
