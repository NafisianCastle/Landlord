"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FREQUENCIES = ["monthly", "quarterly", "yearly"] as const;

export interface LeaseFormValues {
  tenantName?: string;
  tenantPhone?: string | null;
  tenantEmail?: string | null;
  rentAmount?: number | null;
  frequency?: string;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
}

interface LeaseFormProps {
  action: (prevState: unknown, formData: FormData) => Promise<{ error?: string } | undefined>;
  initial?: LeaseFormValues;
  submitLabel: string;
}

export default function LeaseForm({ action, initial, submitLabel }: LeaseFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const t = useTranslations("LeaseForm");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tenantName">{t("tenantName")}</Label>
          <Input
            id="tenantName"
            name="tenantName"
            defaultValue={initial?.tenantName ?? ""}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tenantPhone">{t("tenantPhone")}</Label>
          <Input id="tenantPhone" name="tenantPhone" defaultValue={initial?.tenantPhone ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tenantEmail">{t("tenantEmail")}</Label>
          <Input
            id="tenantEmail"
            name="tenantEmail"
            type="email"
            defaultValue={initial?.tenantEmail ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rentAmount">{t("rentAmount")}</Label>
          <Input
            id="rentAmount"
            name="rentAmount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.rentAmount ?? ""}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="frequency">{t("frequency")}</Label>
          <select
            id="frequency"
            name="frequency"
            defaultValue={initial?.frequency ?? "monthly"}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm"
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {t(`frequencyOption.${f}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startDate">{t("startDate")}</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={initial?.startDate ?? ""}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="endDate">{t("endDate")}</Label>
          <Input id="endDate" name="endDate" type="date" defaultValue={initial?.endDate ?? ""} />
          <p className="text-xs text-muted-foreground">{t("endDateHint")}</p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">{t("notes")}</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={initial?.notes ?? ""} />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? t("saving") : submitLabel}
      </Button>
    </form>
  );
}
