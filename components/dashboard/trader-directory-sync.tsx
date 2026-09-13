"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { getSupabaseConfig } from "@/lib/supabase/config";

/** Refresh an open trader directory when an administrator changes publication data. */
export function TraderDirectorySync() {
  const pathname = usePathname();
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!pathname.startsWith("/dashboard/traders") || !getSupabaseConfig()) return;

    const supabase = createClient();
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 120);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    const channel = supabase
      .channel("customer-trader-directory")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "copy_traders" },
        refresh,
      )
      .subscribe();

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      void supabase.removeChannel(channel);
    };
  }, [pathname, router]);

  return null;
}
