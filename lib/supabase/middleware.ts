import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";
import { sanitizeAdminReturnPath, sanitizeCustomerReturnPath } from "@/lib/auth/redirects";

function loginRedirect(request: NextRequest, loginPath: "/login" | "/admin/login") {
  const currentPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const returnPath = loginPath === "/admin/login"
    ? sanitizeAdminReturnPath(currentPath)
    : sanitizeCustomerReturnPath(currentPath);
  const url = request.nextUrl.clone();
  url.pathname = loginPath;
  url.search = "";
  url.searchParams.set("returnUrl", returnPath);
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const configuration = getSupabaseConfig();
  if (!configuration) {
    // Public account-entry screens can explain unavailability. Private pages
    // never become public just because local authentication is not configured.
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
      return loginRedirect(request, "/admin/login");
    }
    if (["/dashboard", "/deposit", "/withdraw", "/copy-trading", "/transactions", "/settings"].some((prefix) => pathname.startsWith(prefix))) {
      return loginRedirect(request, "/login");
    }
    return NextResponse.next({ request });
  }
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    configuration.url,
    configuration.key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Unauthenticated checks
  if (!user && (pathname.startsWith("/dashboard") || pathname.startsWith("/deposit") || pathname.startsWith("/withdraw") || pathname.startsWith("/copy-trading") || pathname.startsWith("/transactions") || pathname.startsWith("/settings"))) {
    return loginRedirect(request, "/login");
  }

  // 2. Admin Route Protection (Requires dedicated admin authentication)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!user) {
      return loginRedirect(request, "/admin/login");
    }
    // Server-managed metadata is authoritative. user_metadata is user-editable.
    if (user.app_metadata?.role !== "admin") {
      return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
    }
  }

  // 3. Prevent logged in users from visiting /login or /register if already authenticated
  if (user && (pathname === "/login" || pathname === "/register")) {
    const safeReturn = sanitizeCustomerReturnPath(request.nextUrl.searchParams.get("returnUrl"));
    return NextResponse.redirect(new URL(safeReturn, request.url));
  }

  if (user?.app_metadata?.role === "admin" && pathname === "/admin/login") {
    const safeReturn = sanitizeAdminReturnPath(request.nextUrl.searchParams.get("returnUrl"));
    return NextResponse.redirect(new URL(safeReturn, request.url));
  }

  return supabaseResponse;
}
