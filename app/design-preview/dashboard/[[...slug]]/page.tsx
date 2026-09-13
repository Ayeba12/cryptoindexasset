"use client";

import { useParams } from "next/navigation";

import { EmptyState, NotFoundState } from "@/components/dashboard/data-state";
import { PageHeading } from "@/components/dashboard/page-heading";
import { resolvePreviewRoute } from "@/components/dashboard/preview/routes";

/**
 * Maps `/design-preview/dashboard/<slug>` to the preview view registered in
 * `PREVIEW_ROUTES` for the matching live route pattern.
 */
export default function DashboardPreviewPage() {
  const params = useParams<{ slug?: string[] }>();
  const slug = Array.isArray(params?.slug) ? params.slug : params?.slug ? [params.slug] : [];
  const resolution = resolvePreviewRoute(slug);

  if (resolution.kind === "view") {
    const View = resolution.component;
    return <View params={resolution.route.params} />;
  }

  if (resolution.kind === "not-built") {
    return (
      <>
        <PageHeading title={resolution.route.title} />
        <EmptyState
          region="Preview"
          headingLevel={2}
          title="Preview not built yet"
          description={`No preview view is registered for ${resolution.route.pattern}. The page builder adds it to PREVIEW_ROUTES in components/dashboard/preview/routes.tsx.`}
        />
      </>
    );
  }

  return (
    <>
      <PageHeading title="Unknown preview route" />
      <NotFoundState
        region="Preview"
        headingLevel={2}
        title="Unknown preview route"
        description={`${resolution.path} does not match a dashboard route pattern.`}
      />
    </>
  );
}
