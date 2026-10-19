import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { hasActiveAccess } from "@/lib/access";
import GuestMigration from "@/components/system/GuestMigration";
import AppShell from "@/components/system/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (user && !(await hasActiveAccess(user.id))) {
    redirect("/paywall");
  }

  return (
    <>
      {user && <GuestMigration />}
      <AppShell user={user} showGuestBanner>
        {children}
      </AppShell>
    </>
  );
}
