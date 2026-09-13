import { NotFoundState } from "@/components/dashboard/data-state";
import { PageHeading } from "@/components/dashboard/page-heading";

/** Unknown route or record inside the dashboard. Reveals nothing about other accounts. */
export default function DashboardNotFound() {
  return (
    <>
      <PageHeading title="Page not found" />
      <NotFoundState
        region="Page"
        headingLevel={2}
        title="This page is not available"
        description="The address may be wrong or the record may not exist on your account."
        backHref="/dashboard"
        backLabel="Back to overview"
      />
    </>
  );
}
