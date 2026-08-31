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
      "crystal_balances",
      "creator_applications",
    ];

    if (includeUsers) {
      collections.push("users");
    }

    const results: Record<string, number> = {};
    let totalDeleted = 0;

    // Delete all collections in parallel
    const deleteResults = await Promise.all(
      collections.map(async (name) => {
        const col = await getCollection(name);
        const count = await col.countDocuments();
        if (count > 0) {
          const res = await col.deleteMany({});
          return [name, res.deletedCount] as const;
        }
        return [name, 0] as const;
      })
    );

    for (const [name, count] of deleteResults) {
      results[name] = count;
      totalDeleted += count;
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
