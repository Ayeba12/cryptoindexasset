"use client";

import type { ComponentType } from "react";

import { resolveRoute, type ResolvedRoute, type RoutePattern } from "@/lib/dashboard/navigation";

import { ComponentReference } from "./component-reference";
import { ScreenPreview } from "./screen-preview";
import { ROUTE_PATTERNS } from "@/lib/dashboard/navigation";

/** Props every preview view receives. Data comes from `usePreviewData()` / `useRegion()`. */
export interface PreviewViewProps {
  /** Dynamic segment values (`currency`, `transactionId`, `traderId`, `allocationId`). */
  params: Record<string, string>;
}

/**
 * Every customer route uses the same screen implementation as its live page.
 * Fixture reads/actions stay in the preview provider. The component reference
 * keeps its own static route.
 */
export const PREVIEW_ROUTES = Object.fromEntries(ROUTE_PATTERNS.map(route => [route,
  function PreviewRoute({ params }: PreviewViewProps) { return <ScreenPreview route={route} params={params} />; },
])) as Record<RoutePattern, ComponentType<PreviewViewProps>>;

/** The component reference page (`/design-preview/dashboard/components`). */
export const PREVIEW_COMPONENT_REFERENCE: ComponentType = ComponentReference;

/** Result of {@link resolvePreviewRoute}. */
export type PreviewResolution =
  | { kind: "view"; route: ResolvedRoute; component: ComponentType<PreviewViewProps> }
  | { kind: "not-built"; route: ResolvedRoute }
  | { kind: "unknown"; path: string };

/** Map a preview slug (segments after `/design-preview/dashboard`) to a view. */
export function resolvePreviewRoute(slug: readonly string[] | undefined): PreviewResolution {
  const path = `/dashboard${slug && slug.length > 0 ? `/${slug.join("/")}` : ""}`;
  const route = resolveRoute(path);
  if (!route) return { kind: "unknown", path };
  const component = PREVIEW_ROUTES[route.pattern];
  if (!component) return { kind: "not-built", route };
  return { kind: "view", route, component };
}
