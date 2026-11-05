import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

// RLS scopes this to the caller's own rows, same as the lease-payments report.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: expenses, error } = await supabase
    .from("expenses")
    .select("expense_date, category, amount, notes, land_plots(name), apartments(name)")
    .order("expense_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = ["Date", "Property", "Category", "Amount", "Notes"];
  const lines = [header.join(",")];

  for (const e of expenses ?? []) {
    const landPlot = e.land_plots as unknown as { name: string } | null;
    const apartment = e.apartments as unknown as { name: string } | null;
    const propertyName = landPlot?.name ?? apartment?.name ?? "";
    lines.push(
      [
        e.expense_date,
        csvEscape(propertyName),
        e.category,
        String(e.amount),
        csvEscape(e.notes ?? ""),
      ].join(","),
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="expenses-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
