import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export default async function LeasesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const t = await getTranslations("LeasesPage");

  if (!user) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 p-6">
        <p className="text-sm text-muted-foreground">{t("signInRequired")}</p>
      </div>
    );
  }

  await supabase.rpc("ensure_all_lease_payments");

  const [{ data: leases, error }, { data: unpaidPayments }] = await Promise.all([
    supabase
      .from("leases")
      .select(
        "id, tenant_name, rent_amount, frequency, status, plot_id, apartment_id, land_plots(name), apartments(name)",
      )
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase
      .from("lease_payments")
      .select("lease_id, due_date")
      .eq("paid", false)
      .order("due_date", { ascending: true }),
  ]);

  const nextDueByLease = new Map<string, string>();
  for (const p of unpaidPayments ?? []) {
    if (!nextDueByLease.has(p.lease_id)) nextDueByLease.set(p.lease_id, p.due_date);
  }

  const bdt = new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  });

  const rows = (leases ?? []).map((lease) => {
    const landPlot = lease.land_plots as unknown as { name: string } | null;
    const apartment = lease.apartments as unknown as { name: string } | null;
    return {
      id: lease.id,
      tenantName: lease.tenant_name,
      rentAmount: lease.rent_amount,
      frequency: lease.frequency,
      propertyName: landPlot?.name ?? apartment?.name ?? "",
      propertyHref: lease.plot_id ? `/plots/${lease.plot_id}` : `/apartments/${lease.apartment_id}`,
      nextDue: nextDueByLease.get(lease.id) ?? null,
    };
  });

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">{t("title")}</h1>

      {error ? (
        <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {t("loadError", { message: error.message })}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {rows.map((row) => (
            <li key={row.id} className="p-3">
              <Link href={row.propertyHref} className="flex flex-col">
                <span className="font-medium">
                  {row.tenantName} · {row.propertyName}
                </span>
                <span className="text-sm text-muted-foreground">
                  {bdt.format(row.rentAmount)} · {t(`frequency.${row.frequency}`)}
                  {row.nextDue ? ` · ${t("nextDue", { date: row.nextDue })}` : ` · ${t("allPaid")}`}
                </span>
              </Link>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">{t("noLeasesYet")}</li>
          )}
        </ul>
      )}
    </div>
  );
}
