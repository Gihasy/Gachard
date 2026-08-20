import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    adminUsername: process.env.ADMIN_USERNAME || "(not set)",
    adminPasswordLength: (process.env.ADMIN_PASSWORD || "").length,
  });
}
