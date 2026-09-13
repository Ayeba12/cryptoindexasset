import { Skeleton } from "@/components/ui/skeleton";
export default function AdminLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading admin screen"
      className="space-y-6"
    >
      <p role="status" className="ca-body">
        Loading administration…
      </p>
      <Skeleton className="h-10 w-48" />
      <div className="admin-stats">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
