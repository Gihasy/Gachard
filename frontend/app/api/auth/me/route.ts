import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserBySessionToken } from "@/lib/auth";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  let token = cookieStore.get("session_token")?.value;

  if (!token) {
    const auth = request.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) token = auth.slice(7);
  }

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserBySessionToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    user_id: user._id.toString(),
    username: user.username,
    email: user.email,
    name: user.name ?? null,
    picture: user.picture ?? null,
  });
}
