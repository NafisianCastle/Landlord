import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasActiveAccess } from "@/lib/access";
import AppShell from "@/components/system/AppShell";

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
    <>
      <AppShell user={user}>{children}</AppShell>
    </>
  );
}
