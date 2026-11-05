import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { hasActiveAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { isDemoAccount } from "@/lib/demo";
import AppShell from "@/components/system/AppShell";
import AppMessages from "@/components/system/AppMessages";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!(await hasActiveAccess(user.id))) {
    redirect("/paywall");
  }

  const isDemo = await isDemoAccount(await createClient(), user.id);

  return (
    <AppMessages>
      <AppShell user={user} isDemo={isDemo}>{children}</AppShell>
    </AppMessages>
  );
}
