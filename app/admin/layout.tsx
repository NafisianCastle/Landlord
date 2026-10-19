import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/dashboard");

  const t = await getTranslations("AdminNav");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
      <nav className="flex flex-wrap gap-4 border-b border-border pb-3 text-sm">
        <Link href="/admin" className="font-medium hover:underline">
          {t("overview")}
        </Link>
        <Link href="/admin/settings" className="font-medium hover:underline">
          {t("settings")}
        </Link>
        <Link href="/admin/coupons" className="font-medium hover:underline">
          {t("coupons")}
        </Link>
        <Link href="/admin/users" className="font-medium hover:underline">
          {t("users")}
        </Link>
        <Link href="/dashboard" className="ml-auto text-muted-foreground hover:underline">
          {t("backToApp")}
        </Link>
      </nav>
      {children}
    </div>
  );
}
