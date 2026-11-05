import { HeaderSkeleton, SectionCardSkeleton } from "@/components/system/PageSkeletons";

export default function BillsLoading() {
  return (
    <div aria-busy="true" className="mx-auto flex max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <HeaderSkeleton action={false} />
      {Array.from({ length: 3 }).map((_, i) => (
        <SectionCardSkeleton key={i} lines={4} />
      ))}
    </div>
  );
}
