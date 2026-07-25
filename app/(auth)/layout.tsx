import ThemeToggle from "@/components/system/ThemeToggle";
import LocaleSwitcher from "@/components/system/LocaleSwitcher";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex justify-end gap-2 p-4">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
      <div className="flex flex-1 flex-col justify-center">{children}</div>
    </div>
  );
}
