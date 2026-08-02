import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Input } from "@/components/ui/input";
import GrantAccessButton from "@/components/admin/GrantAccessButton";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const t = await getTranslations("AdminUsersPage");
  const admin = createAdminClient();

  let query = admin
    .from("profiles")
    .select("id, email, full_name, trial_ends_at, is_admin")
    .order("created_at", { ascending: false })
    .limit(50);

  if (q) query = query.ilike("email", `%${q}%`);

  const { data: profiles } = await query;
  const userIds = (profiles ?? []).map((p) => p.id);

  const { data: subscriptions } = await admin
    .from("subscriptions")
    .select("user_id, status")
    .in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  const paidUserIds = new Set((subscriptions ?? []).filter((s) => s.status === "completed").map((s) => s.user_id));
  const trialActive = (endsAt: string) => new Date(endsAt) > new Date();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <form className="flex gap-2">
        <Input name="q" defaultValue={q ?? ""} placeholder={t("searchPlaceholder")} />
      </form>
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {(profiles ?? []).map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 p-3 text-sm">
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium">
                {p.full_name || p.email} {p.is_admin ? `· ${t("admin")}` : ""}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {p.email} ·{" "}
                {paidUserIds.has(p.id)
                  ? t("paid")
                  : trialActive(p.trial_ends_at)
                    ? t("trialActive")
                    : t("trialExpired")}
              </span>
            </div>
            {!paidUserIds.has(p.id) && <GrantAccessButton userId={p.id} />}
          </li>
        ))}
        {(!profiles || profiles.length === 0) && (
          <li className="p-3 text-sm text-muted-foreground">{t("noUsersFound")}</li>
        )}
      </ul>
    </div>
  );
}
