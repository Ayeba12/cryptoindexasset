import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // Exact, static public pages do not read a session or expose account data.
  // Do not use a prefix here: copy-trading subpaths retain their existing protection.
  if ([
    "/",
    "/how-it-works",
    "/copy-trading",
    "/about",
    "/contact",
    "/fees",
    "/security",
    "/risk-disclosure",
    "/terms",
    "/policy",
    "/cookie-policy"
  ].includes(path)) {
    return NextResponse.next();
  }
  // Health and monitoring endpoints must remain reachable for external probes
  if (path === "/api/health" || path.startsWith("/api/health/")) {
    return NextResponse.next();
  }
  // Isolated design review remains development-only.
  if (process.env.NODE_ENV === "development" &&
      (path === "/design-preview" || path.startsWith("/design-preview/"))) {
    return NextResponse.next();
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public asset folders
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
