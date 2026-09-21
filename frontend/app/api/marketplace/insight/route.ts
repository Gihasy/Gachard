import { NextResponse } from "next/server";
import { generateMarketInsight } from "@/lib/market-insight";
import { isAIEnabled } from "@/lib/ai-flags";

export async function GET() {
  // AI dimatikan (ADR-030): balas 200 dengan insight null supaya UI menyembunyikan panelnya,
  // bukan 500 yang terlihat seperti fitur rusak.
  if (!isAIEnabled()) {
    return NextResponse.json({ insight: null, disabled: true });
  }

  try {
    const insight = await generateMarketInsight();
    return NextResponse.json({ insight });
  } catch (error) {
    console.error("[marketplace/insight]", error);
    return NextResponse.json({ insight: null, error: "Failed to generate insight" }, { status: 500 });
  }
}
