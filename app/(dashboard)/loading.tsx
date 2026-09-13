import { RegionSkeleton } from "@/components/dashboard/data-state";
import { Skeleton } from "@/components/ui/skeleton";

/** Shell-shaped page skeleton: heading, summary grid and one panel. Keeps the page geometry. */
export default function DashboardLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading page">
      <div className="ca-page-intro">
        <div className="ca-page-intro-text">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-72 max-w-full" />
        </div>
        <div className="ca-page-intro-actions">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <div className="ca-sections">
        <RegionSkeleton variant="summary" region="summary" />
        <div className="rounded-lg bg-card p-4 ring-1 ring-border md:p-6">
          <Skeleton className="mb-4 h-7 w-40" />
          <RegionSkeleton variant="table" region="content" rows={5} />
        </div>
      </div>
    </div>
  );
}
