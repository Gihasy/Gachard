import { NextResponse } from "next/server";
import { seedCardTemplates, updateArtworkUrls } from "@/lib/card-templates";

/**
 * POST /api/seed-templates
 * Seed card_templates if empty, then update artworkUrl for all templates.
 * Call once after deploying with artwork files.
 */
export async function POST() {
  try {
    // Seed if empty
    await seedCardTemplates();

    // Update artworkUrl for all templates
    const updated = await updateArtworkUrls();

    return NextResponse.json({
      status: "ok",
      artworkUrlsUpdated: updated,
    });
  } catch (error) {
    console.error("Seed templates error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
