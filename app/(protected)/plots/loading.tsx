import { Skeleton } from "@/components/ui/skeleton";

export default function PlotsLoading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>

      <Skeleton className="h-64 w-full rounded-lg" />

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 p-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        ))}
      </div>
    </div>
  );
}
