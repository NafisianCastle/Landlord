import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import PageContainer from "@/components/system/PageContainer";

// Route loading.tsx building blocks, matching the shapes of the real pages
// (PageContainer + PageHeader + cards/lists) so content doesn't jump in.
// aria-busy lets assistive tech announce the page as loading.

export function HeaderSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Skeleton className="h-7 w-40" />
      {action && <Skeleton className="h-9 w-28" />}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 p-3">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex flex-col gap-2 p-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SectionCardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-0">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={i === lines - 1 ? "h-4 w-2/3" : "h-4 w-full"} />
        ))}
      </CardContent>
    </Card>
  );
}

/** Search box + list, e.g. apartments, leases, vendors. */
export function ListPageSkeleton({ rows = 5, search = true }: { rows?: number; search?: boolean }) {
  return (
    <PageContainer>
      <div aria-busy="true" className="flex flex-col gap-4">
        <HeaderSkeleton />
        {search && <Skeleton className="h-9 w-full" />}
        <ListSkeleton rows={rows} />
      </div>
    </PageContainer>
  );
}

/** A property/record detail page: header, a hero block and stacked sections. */
export function DetailPageSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <div aria-busy="true" className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
      {Array.from({ length: sections }).map((_, i) => (
        <SectionCardSkeleton key={i} />
      ))}
    </div>
  );
}
