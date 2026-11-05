"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface MaintenanceRequestFormProps {
  action: (prevState: unknown, formData: FormData) => Promise<{ error?: string } | undefined>;
  vendors?: { id: string; name: string }[];
}

export default function MaintenanceRequestForm({ action, vendors }: MaintenanceRequestFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const t = useTranslations("MaintenanceRequestForm");

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">{t("title")}</Label>
          <Input id="title" name="title" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cost">{t("cost")}</Label>
          <Input id="cost" name="cost" type="number" step="0.01" min="0" />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="reportedDate">{t("reportedDate")}</Label>
          <Input
            id="reportedDate"
            name="reportedDate"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
        {vendors && vendors.length > 0 && (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="vendorId">{t("vendor")}</Label>
            <Select
              id="vendorId"
              name="vendorId"
              defaultValue=""
            >
              <option value="">{t("noVendor")}</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">{t("description")}</Label>
        <Textarea id="description" name="description" rows={2} />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-fit" disabled={pending}>
        {pending ? t("saving") : t("addRequest")}
      </Button>
    </form>
  );
}
