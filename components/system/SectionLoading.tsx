import { Skeleton } from "@/components/ui/skeleton";

export default function SectionLoading() {
  return (
    <div aria-hidden="true" className="flex min-h-32 flex-col gap-3 rounded-lg border border-border p-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
