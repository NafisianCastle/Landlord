import { ListPageSkeleton } from "@/components/system/PageSkeletons";

export default function VendorsLoading() {
  return <ListPageSkeleton rows={4} search={false} />;
}
