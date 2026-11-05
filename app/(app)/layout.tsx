import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { hasActiveAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { isDemoAccount } from "@/lib/demo";
import GuestMigration from "@/components/system/GuestMigration";
import AppShell from "@/components/system/AppShell";
import AppMessages from "@/components/system/AppMessages";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (user && !(await hasActiveAccess(user.id))) {
    redirect("/paywall");
  }
  const isDemo = user ? await isDemoAccount(await createClient(), user.id) : false;

  return (
    <AppMessages>
      {/* Never upload a visitor's private guest records into the shared demo. */}
      {user && !isDemo && <GuestMigration />}
      <AppShell user={user} showGuestBanner isDemo={isDemo}>
        {children}
      </AppShell>
    </AppMessages>
  );
}
