"use client";

import { useActionState, useId } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { VendorRow } from "@/components/vendors/VendorsList";

export default function VendorForm({
  action,
  initial,
  submitLabel,
}: {
  action: (prevState: unknown, formData: FormData) => Promise<{ error?: string } | undefined>;
  initial?: VendorRow;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const t = useTranslations("VendorForm");
  const id = useId();

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-name`}>{t("name")}</Label>
          <Input id={`${id}-name`} name="name" defaultValue={initial?.name ?? ""} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-trade`}>{t("trade")}</Label>
          <Input
            id={`${id}-trade`}
            name="trade"
            defaultValue={initial?.trade ?? ""}
            placeholder={t("tradePlaceholder")}
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={`${id}-phone`}>{t("phone")}</Label>
          <Input id={`${id}-phone`} name="phone" type="tel" defaultValue={initial?.phone ?? ""} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-notes`}>{t("notes")}</Label>
        <Textarea id={`${id}-notes`} name="notes" rows={2} defaultValue={initial?.notes ?? ""} />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-fit" disabled={pending}>
        {pending ? t("saving") : (submitLabel ?? t("addVendor"))}
      </Button>
    </form>
  );
}
