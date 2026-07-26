import Link from "next/link";
import { LogOut } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { User } from "@supabase/supabase-js";
import { signOut } from "@/app/actions/auth";
import Sidebar from "@/components/system/Sidebar";
import BottomNav from "@/components/system/BottomNav";
import ThemeToggle from "@/components/system/ThemeToggle";
import LocaleSwitcher from "@/components/system/LocaleSwitcher";
import Logo from "@/components/system/Logo";
import { Button } from "@/components/ui/button";

export default async function AppShell({
  user,
  showGuestBanner = false,
  children,
}: {
  user: User | null;
  showGuestBanner?: boolean;
  children: React.ReactNode;
}) {
  const t = await getTranslations("ProtectedLayout");
  const tGuest = await getTranslations("GuestMode");

  return (
    <div className="min-h-screen md:flex">
      <Sidebar signedIn={Boolean(user)} />

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
          <span className="flex items-center gap-2 font-semibold">
            <Logo className="size-6 rounded-md" />
            Landlord
          </span>
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

        {showGuestBanner && !user && (
          <p className="border-b border-border bg-muted/50 px-4 py-2 text-center text-sm text-muted-foreground md:px-6">
            {tGuest("guestBanner")}{" "}
            <Link href="/signup" className="font-medium text-foreground underline">
              {tGuest("signUp")}
            </Link>
          </p>
        )}

        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
