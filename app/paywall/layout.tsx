import AppMessages from "@/components/system/AppMessages";

export default function PaywallLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppMessages>{children}</AppMessages>;
}
