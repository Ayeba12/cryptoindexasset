import "server-only";
import type { RoutePattern } from "@/lib/dashboard/navigation";
import { getDashboardData } from "@/lib/dashboard/queries.server";
import { loadScreen } from "@/lib/dashboard/screen-data";
import { DashboardScreen } from "./screen";

export interface LivePageProps {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export function livePage(route: RoutePattern) {
  return async function DashboardPage({ params, searchParams }: LivePageProps) {
    const [segments, search, source] = await Promise.all([
      params,
      searchParams,
      getDashboardData(),
    ]);
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(search ?? {}))
      if (typeof value === "string") query.set(key, value);
    const data = await loadScreen(source, route, segments ?? {}, query);
    return <DashboardScreen route={route} data={data} />;
  };
}
