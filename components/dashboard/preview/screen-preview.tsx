"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FIXTURE_CLOCK } from "@/lib/dashboard/fixtures/scenarios";
import { ROUTE_TITLES, type RoutePattern } from "@/lib/dashboard/navigation";
import { loadScreen, type ScreenData } from "@/lib/dashboard/screen-data";
import { PageHeading } from "../page-heading";
import { ErrorState, RegionSkeleton } from "../data-state";
import { DashboardScreen } from "../views/screen";
import { usePreviewData } from "./provider";

export function ScreenPreview({
  route,
  params,
}: {
  route: RoutePattern;
  params: Record<string, string>;
}) {
  const { data, version, scenarioId, showLoading, showReadError } =
    usePreviewData();
  const search = useSearchParams()?.toString() ?? "";
  const segments = JSON.stringify(params);
  const key = `${route}:${segments}:${search}:${scenarioId}:${showLoading}:${showReadError}`;
  const [snapshot, setSnapshot] = useState<{
    key: string;
    data?: ScreenData;
    error?: boolean;
  } | null>(null);
  const [revision, setRevision] = useState(0);
  const retry = () => setRevision((value) => value + 1);
  useEffect(() => {
    let current = true;
    void loadScreen(
      data,
      route,
      JSON.parse(segments),
      new URLSearchParams(search),
    ).then(
      (result) => {
        if (current) setSnapshot({ key, data: result });
      },
      () => {
        if (current) setSnapshot({ key, error: true });
      },
    );
    return () => {
      current = false;
    };
  }, [data, version, route, segments, search, key, revision]);
  if (!snapshot || snapshot.key !== key)
    return (
      <>
        <PageHeading title={ROUTE_TITLES[route]} />
        <RegionSkeleton region={ROUTE_TITLES[route]} variant="summary" />
      </>
    );
  if (!snapshot.data)
    return (
      <ErrorState
        region={ROUTE_TITLES[route]}
        message="Could not load the dashboard preview."
        onRetry={retry}
      />
    );
  return (
    <DashboardScreen
      route={route}
      data={snapshot.data}
      retry={retry}
      referenceTime={FIXTURE_CLOCK}
    />
  );
}
