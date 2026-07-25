import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { hasActiveAccess } from "@/lib/access";
import SyncManager from "@/components/system/SyncManager";
import GuestMigration from "@/components/system/GuestMigration";
import HeaderNav from "@/components/system/HeaderNav";
import BottomNav from "@/components/system/BottomNav";
import ThemeToggle from "@/components/system/ThemeToggle";
import LocaleSwitcher from "@/components/system/LocaleSwitcher";
import Logo from "@/components/system/Logo";
import { Button } from "@/components/ui/button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && !(await hasActiveAccess(user.id))) {
    redirect("/paywall");
  }

  const t = await getTranslations("ProtectedLayout");
  const tGuest = await getTranslations("GuestMode");

  return (
    <div className="min-h-screen">
      {user && <SyncManager />}
      {user && <GuestMigration />}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2 font-semibold">
            <Logo className="size-6 rounded-md" />
            Landlord
          </span>
          <HeaderNav />
        </div>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <ThemeToggle />
          {user ? (
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="size-4" />
                {t("logOut")}
              </Button>
            </form>
          ) : (
            <Button asChild size="sm">
              <Link href="/signup">{tGuest("signUpToSave")}</Link>
            </Button>
          )}
        </div>
      </header>
      {!user && (
        <p className="border-b border-border bg-muted/50 px-4 py-2 text-center text-sm text-muted-foreground md:px-6">
          {tGuest("guestBanner")}{" "}
          <Link href="/signup" className="font-medium text-foreground underline">
            {tGuest("signUp")}
          </Link>
        </p>
      )}
      <main className="pb-16 md:pb-0">{children}</main>
      <BottomNav />
    </div>
  );
}
