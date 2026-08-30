import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasActiveAccess } from "@/lib/access";
import GuestMigration from "@/components/system/GuestMigration";
import AppShell from "@/components/system/AppShell";

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

  return (
    <>
      {user && <GuestMigration />}
      <AppShell user={user} showGuestBanner>
        {children}
      </AppShell>
    </>
  );
}
