import { HeaderSkeleton, ListSkeleton, StatGridSkeleton } from "@/components/system/PageSkeletons";

export default function AdminLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <HeaderSkeleton action={false} />
      <StatGridSkeleton count={5} />
      <ListSkeleton rows={4} />
    </div>
  );
}
