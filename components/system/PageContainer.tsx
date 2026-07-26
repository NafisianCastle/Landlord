import { cn } from "@/lib/utils";

export default function PageContainer({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6", className)}>
      {children}
    </div>
  );
}
