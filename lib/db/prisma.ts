import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Ensures Supabase connection strings use port 6543 (transaction mode with pgbouncer).
 * Port 5432 on pooler.supabase.com is session mode, strictly capped at 15 clients (EMAXCONNSESSION).
 */
function getNormalizedDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  if (url.includes("pooler.supabase.com:5432")) {
    url = url.replace(":5432", ":6543");
    if (!url.includes("pgbouncer=true")) {
      url += (url.includes("?") ? "&" : "?") + "pgbouncer=true";
    }
  }
  return url;
}

const datasourceUrl = getNormalizedDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

globalForPrisma.prisma = prisma;

