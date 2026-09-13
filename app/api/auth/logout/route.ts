import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function POST(request: NextRequest) {
  const config = getSupabaseConfig();
  const origin = new URL(request.url).origin;
  const response = NextResponse.redirect(`${origin}/login`, { status: 302 });

  if (config) {
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
    await supabase.auth.signOut();
  }

  return response;
}
