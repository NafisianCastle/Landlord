import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createMaintenanceRequest, type MaintenanceSubjectType } from "@/app/actions/maintenance";
import { Card, CardContent } from "@/components/ui/card";
import MaintenanceRequestForm from "@/components/maintenance/MaintenanceRequestForm";
import MaintenanceRequestsList, {
  type MaintenanceRequestRow,
} from "@/components/maintenance/MaintenanceRequestsList";

export default async function MaintenanceSection({
  subjectType,
  subjectId,
}: {
  subjectType: MaintenanceSubjectType;
  subjectId: string;
}) {
  const t = await getTranslations("MaintenanceSection");
  const supabase = await createClient();
  const column = subjectType === "plot" ? "plot_id" : "apartment_id";

  const [{ data: requests }, { data: vendors }] = await Promise.all([
    supabase
      .from("maintenance_requests")
      .select("id, title, description, status, cost, reported_date, resolved_date, vendors(name)")
      .eq(column, subjectId)
      .order("reported_date", { ascending: false }),
    supabase.from("vendors").select("id, name").order("name", { ascending: true }),
  ]);

  const rows: MaintenanceRequestRow[] = (requests ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    cost: r.cost,
    reportedDate: r.reported_date,
    resolvedDate: r.resolved_date,
    vendorName: (r.vendors as unknown as { name: string } | null)?.name ?? null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-medium">{t("title")}</h2>
          <Link href="/vendors" className="text-xs text-muted-foreground underline underline-offset-2">
            {t("manageVendors")}
          </Link>
        </div>
        <MaintenanceRequestsList requests={rows} subjectType={subjectType} subjectId={subjectId} />
      </div>
      <Card>
        <CardContent className="pt-6">
          <MaintenanceRequestForm
            action={createMaintenanceRequest.bind(null, subjectType, subjectId)}
            vendors={vendors ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
