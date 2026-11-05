import { getTranslations } from "next-intl/server";
import { getAdminUsers } from "@/lib/adminData";
import { Input } from "@/components/ui/input";
import GrantAccessButton from "@/components/admin/GrantAccessButton";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const t = await getTranslations("AdminUsersPage");
  const profiles = await getAdminUsers(q);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <form className="flex gap-2">
        <Input name="q" defaultValue={q ?? ""} placeholder={t("searchPlaceholder")} />
      </form>
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {profiles.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 p-3 text-sm">
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium">
                {p.fullName || p.email} {p.isAdmin ? `· ${t("admin")}` : ""}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {p.email} · {t(p.status)}
              </span>
            </div>
            {p.status !== "paid" && <GrantAccessButton userId={p.id} />}
          </li>
        ))}
        {profiles.length === 0 && (
          <li className="p-3 text-sm text-muted-foreground">{t("noUsersFound")}</li>
        )}
      </ul>
    </div>
  );
}
