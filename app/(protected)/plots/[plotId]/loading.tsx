import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlotDetailLoading() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-24" />
      </div>

      <Skeleton className="h-[65vh] min-h-[400px] w-full rounded" />

      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-16" />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 pt-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </CardContent>
      </Card>

      <div>
        <Skeleton className="mb-2 h-5 w-20" />
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-28" />
          </CardContent>
        </Card>
      </div>

      <div>
        <Skeleton className="mb-2 h-5 w-24" />
        <div className="rounded-lg border border-border">
          <Skeleton className="m-3 h-4 w-40" />
        </div>
      </div>
    </div>
  );
}
