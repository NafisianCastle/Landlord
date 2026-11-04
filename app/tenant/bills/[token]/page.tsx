import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { getTenantPortal } from "@/lib/tenantPortal";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Tenant bills",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function TenantBillsPage({ params }: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const portal = await getTenantPortal(token);
  if (!portal) notFound();
  const [t, format] = await Promise.all([getTranslations("TenantPortal"), getFormatter()]);
  const today = new Date().toISOString().slice(0, 10);

  return <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-6">
    <header className="rounded-2xl bg-primary p-5 text-primary-foreground">
      <p className="text-sm opacity-80">{t("tenantPortal")}</p>
      <h1 className="mt-1 text-2xl font-semibold">{portal.tenant.apartment_label}</h1>
      <p className="mt-2 text-sm opacity-80">{portal.tenant.invited_email}</p>
    </header>
    <div>
      <h2 className="text-lg font-semibold">{t("bills")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("hint")}</p>
    </div>
    {!portal.bills.length && <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">{t("noBills")}</p>}
    {portal.bills.map((bill) => {
      const status = bill.paid_at ? "paid" : bill.due_date < today ? "overdue" : "unpaid";
      return <article key={bill.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="font-medium">{bill.title}</h3>
          <span className={status === "overdue"
            ? "rounded-full bg-destructive px-2.5 py-1 text-xs text-destructive-foreground"
            : "rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"}>
            {t(`status.${status}`)}
          </span>
        </div>
        <p className="text-sm">
          <strong>{format.number(Number(bill.amount), { style: "currency", currency: "BDT" })}</strong>
          {" · "}{t("due", { date: bill.due_date })}
        </p>
        <a
          href={`/api/tenant-portal/${token}/files/${bill.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-fit text-sm text-primary underline underline-offset-4"
        >{t("viewBill")}</a>
      </article>;
    })}
    <p className="text-xs text-muted-foreground">{t("expires", {
      date: format.dateTime(new Date(portal.expiresAt), { dateStyle: "medium", timeZone: "Asia/Dhaka" }),
    })}</p>
  </main>;
}
