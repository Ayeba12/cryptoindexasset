import { NextResponse } from "next/server";
import { getMarketSnapshot } from "@/lib/market/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getMarketSnapshot();

    return NextResponse.json(
      {
        source: snapshot.source,
        quotedAt: snapshot.quotedAt,
        fetchedAt: snapshot.fetchedAt,
        isStale: snapshot.isStale,
        isFallback: snapshot.isFallback,
        coins: snapshot.coins,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.error("[api/market/coins] Failed to retrieve market coins", error);
    return NextResponse.json(
      { error: "Market data service currently unavailable" },
      { status: 503 },
    );
  }
}
