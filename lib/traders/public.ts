import "server-only";
import { prisma } from "@/lib/db/prisma";

export interface PublicTraderCard {
  id: string;
  name: string;
  avatar: string | null;
  avatarAlt: string | null;
  style: string;
  assets: string;
  copiers: string;
  accuracy: string;
  rating: string | null;
  reviews: string | null;
}

/** null means unavailable; [] means no profiles are published for the homepage. */
export async function getPublicFeaturedTraders(): Promise<PublicTraderCard[] | null> {
  try {
    const rows = await prisma.copyTrader.findMany({
      where: { status: "Published", isActive: true, featured: true },
      select: {
        id: true, name: true, avatar: true, avatarAlt: true, strategy: true,
        assets: true, totalFollowers: true, accuracy: true, rating: true, ratingCount: true,
      },
      orderBy: [{ featuredOrder: "asc" }, { totalFollowers: "desc" }, { name: "asc" }],
      take: 8,
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      avatar: row.avatar,
      avatarAlt: row.avatarAlt,
      style: row.strategy?.trim() || "Strategy not supplied",
      assets: row.assets || "Assets not supplied",
      copiers: row.totalFollowers.toLocaleString("en-US"),
      accuracy: row.accuracy != null ? `${row.accuracy.toFixed(1)}%` : "Not supplied",
      rating: row.rating != null ? row.rating.toFixed(1) : null,
      reviews: row.ratingCount > 0 ? String(row.ratingCount) : null,
    }));
  } catch {
    console.warn("[public-site] Published trader profiles could not be loaded.");
    return null;
  }
}
