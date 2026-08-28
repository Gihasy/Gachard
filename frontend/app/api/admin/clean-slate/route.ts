import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  return doCleanSlate(req);
}

export async function POST(req: NextRequest) {
  return doCleanSlate(req);
}

async function doCleanSlate(req: NextRequest) {
  try {
    const includeUsers = req.nextUrl.searchParams.get("includeUsers") === "true";

    const collections = [
      "cards",
      "transactions",
      "redeem_codes",
      "rate_limits",
      "shipping_addresses",
      "payments",
      "listings",
      "wishlist",
      "supporters",
    ];

    if (includeUsers) {
      collections.push("users");
    }

    const results: Record<string, number> = {};
    let totalDeleted = 0;

    for (const name of collections) {
      const col = await getCollection(name);
      const count = await col.countDocuments();
      if (count > 0) {
        const res = await col.deleteMany({});
        results[name] = res.deletedCount;
        totalDeleted += res.deletedCount;
      } else {
        results[name] = 0;
      }
    }

    // Preserved counts
    const templatesCol = await getCollection("card_templates");
    const preserved: Record<string, number> = {
      card_templates: await templatesCol.countDocuments(),
    };

    if (!includeUsers) {
      const usersCol = await getCollection("users");
      preserved.users = await usersCol.countDocuments();
    }

    return NextResponse.json(
      { totalDeleted, deleted: results, preserved, includeUsers },
      { headers: { "Cache-Control": "no-store, private" } }
    );
  } catch (error) {
    console.error("[admin/clean-slate]", error);
    return NextResponse.json(
      { error: "Clean slate failed" },
      { status: 500, headers: { "Cache-Control": "no-store, private" } }
    );
  }
}
