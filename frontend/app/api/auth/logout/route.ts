import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (token) {
    await deleteSession(token);
  }

  const response = NextResponse.json({ ok: true });
  // Clear both cookies via explicit Set-Cookie headers (deterministic).
  response.headers.append(
    "Set-Cookie",
    "session_token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None"
  );
  response.headers.append(
    "Set-Cookie",
    "gachard_uid=; Path=/; Max-Age=0; Secure; SameSite=Lax"
  );
  return response;
}
