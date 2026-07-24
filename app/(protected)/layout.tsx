import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { hasActiveAccess } from "@/lib/access";
import SyncManager from "@/components/system/SyncManager";
import HeaderNav from "@/components/system/HeaderNav";
import BottomNav from "@/components/system/BottomNav";
import ThemeToggle from "@/components/system/ThemeToggle";
import Logo from "@/components/system/Logo";
import { Button } from "@/components/ui/button";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!(await hasActiveAccess(user.id))) {
    redirect("/paywall");
  }

  return (
    <div className="min-h-screen">
      <SyncManager />
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2 font-semibold">
            <Logo className="size-6 rounded-md" />
            Landlord
          </span>
          <HeaderNav />
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="size-4" />
              Log out
            </Button>
          </form>
        </div>
      </header>
      <main className="pb-16 md:pb-0">{children}</main>
      <BottomNav />
    </div>
  );
}
