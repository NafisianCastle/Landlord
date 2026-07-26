import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

interface AuditRow {
  id: string;
  actor_email: string | null;
  action: string;
  created_at: string;
}

export default async function ApartmentAuditLog({
  apartmentId,
  isOwner,
}: {
  apartmentId: string;
  isOwner: boolean;
}) {
  if (!isOwner) return null;

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("apartment_audit_log")
    .select("id, actor_email, action, created_at")
    .eq("apartment_id", apartmentId)
    .order("created_at", { ascending: false })
    .limit(20);

  const t = await getTranslations("ApartmentAuditLog");
  const entries = (rows ?? []) as AuditRow[];

  return (
    <div>
      <h2 className="mb-2 font-medium">{t("title")}</h2>
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {entries.map((row) => (
          <li key={row.id} className="p-3 text-sm">
            <span className="font-medium">{row.actor_email ?? t("unknownActor")}</span>{" "}
            <span className="text-muted-foreground">{t(`action.${row.action}`)}</span>{" "}
            <span className="text-xs text-muted-foreground">
              · {new Date(row.created_at).toLocaleString()}
            </span>
          </li>
        ))}
        {entries.length === 0 && (
          <li className="p-3 text-sm text-muted-foreground">{t("noHistoryYet")}</li>
        )}
      </ul>
    </div>
  );
}
