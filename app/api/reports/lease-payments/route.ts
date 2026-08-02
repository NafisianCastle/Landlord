import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

// RLS scopes this to the caller's own rows, same as every other query in the
// app — no admin client needed.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: payments, error } = await supabase
    .from("lease_payments")
    .select(
      "due_date, amount, paid, paid_date, paid_amount, notes, leases!inner(tenant_name, land_plots(name), apartments(name))",
    )
    .order("due_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = [
    "Tenant",
    "Property",
    "Due date",
    "Amount",
    "Paid",
    "Paid date",
    "Paid amount",
    "Notes",
  ];
  const lines = [header.join(",")];

  for (const p of payments ?? []) {
    const lease = Array.isArray(p.leases) ? p.leases[0] : p.leases;
    const landPlot = lease?.land_plots as unknown as { name: string } | null;
    const apartment = lease?.apartments as unknown as { name: string } | null;
    const propertyName = landPlot?.name ?? apartment?.name ?? "";
    lines.push(
      [
        csvEscape(lease?.tenant_name ?? ""),
        csvEscape(propertyName),
        p.due_date,
        String(p.amount),
        p.paid ? "yes" : "no",
        p.paid_date ?? "",
        p.paid_amount != null ? String(p.paid_amount) : "",
        csvEscape(p.notes ?? ""),
      ].join(","),
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rent-payments-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
