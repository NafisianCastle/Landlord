import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createExpense, type ExpenseSubjectType } from "@/app/actions/expenses";
import { Card, CardContent } from "@/components/ui/card";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import ExpensesList, { type ExpenseRow } from "@/components/expenses/ExpensesList";

export default async function ExpenseSection({
  subjectType,
  subjectId,
}: {
  subjectType: ExpenseSubjectType;
  subjectId: string;
}) {
  const t = await getTranslations("ExpenseSection");
  const supabase = await createClient();
  const column = subjectType === "plot" ? "plot_id" : "apartment_id";

  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, category, amount, expense_date, notes")
    .eq(column, subjectId)
    .order("expense_date", { ascending: false });

  const rows: ExpenseRow[] = (expenses ?? []).map((e) => ({
    id: e.id,
    category: e.category,
    amount: e.amount,
    expenseDate: e.expense_date,
    notes: e.notes,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="mb-2 font-medium">{t("title")}</h2>
        <ExpensesList expenses={rows} subjectType={subjectType} subjectId={subjectId} />
      </div>
      <Card>
        <CardContent className="pt-6">
          <ExpenseForm action={createExpense.bind(null, subjectType, subjectId)} />
        </CardContent>
      </Card>
    </div>
  );
}
