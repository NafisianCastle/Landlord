import Logo from "@/components/system/Logo";

export default function RootLoading() {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-3">
      <Logo className="size-16 animate-pulse rounded-2xl" />
      <p className="text-sm text-muted-foreground">Landlord</p>
    </div>
  );
}
