"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateAppSettings } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AppSettingsForm({
  lifetimePriceBdt,
  trialDays,
}: {
  lifetimePriceBdt: number;
  trialDays: number;
}) {
  const [state, formAction, pending] = useActionState(updateAppSettings, undefined);
  const t = useTranslations("AdminSettingsForm");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lifetimePriceBdt">{t("lifetimePriceBdt")}</Label>
          <Input
            id="lifetimePriceBdt"
            name="lifetimePriceBdt"
            type="number"
            min="1"
            defaultValue={lifetimePriceBdt}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="trialDays">{t("trialDays")}</Label>
          <Input
            id="trialDays"
            name="trialDays"
            type="number"
            min="1"
            defaultValue={trialDays}
            required
          />
          <p className="text-xs text-muted-foreground">{t("trialDaysHint")}</p>
        </div>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{t("saved")}</p>}
      <Button type="submit" className="w-fit" disabled={pending}>
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
