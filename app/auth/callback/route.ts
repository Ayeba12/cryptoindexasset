import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { sanitizeAuthCallbackPath } from "@/lib/auth/redirects";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeAuthCallbackPath(searchParams.get("next"));

  if (code) {
    const config = getSupabaseConfig();
    if (config) {
      const response = NextResponse.redirect(new URL(next, origin));
      const supabase = createServerClient(config.url, config.key, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options as any)
            );
          },
        },
      });
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return response;
      }
    }
  }

  const failureUrl = new URL("/login", origin);
  failureUrl.searchParams.set("error", "auth_code_error");
  return NextResponse.redirect(failureUrl);
}
