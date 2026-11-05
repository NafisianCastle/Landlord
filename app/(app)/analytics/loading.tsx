import PageContainer from "@/components/system/PageContainer";
import { HeaderSkeleton, ListSkeleton, StatGridSkeleton } from "@/components/system/PageSkeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <PageContainer>
      <div aria-busy="true" className="flex flex-col gap-4">
        <HeaderSkeleton action={false} />
        <StatGridSkeleton count={2} />
        <Skeleton className="h-48 w-full rounded-lg" />
        <ListSkeleton rows={4} />
      </div>
    </PageContainer>
  );
}
