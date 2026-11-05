"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { createApartmentBill, submitBillProof } from "@/app/actions/bills";
import { BILL_ACCEPT } from "@/lib/validation/bills";
import type { TenantShare } from "@/lib/bills";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export default function BillForm({ apartmentId, tenants = [], billId }: {
  apartmentId?: string; tenants?: TenantShare[]; billId?: string;
}) {
  const t = useTranslations("Bills");
  const id = useId();
  const ref = useRef<HTMLFormElement>(null);
  const action = billId ? submitBillProof.bind(null, billId) : createApartmentBill.bind(null, apartmentId!);
  const [state, formAction, pending] = useActionState(action, undefined);
  useEffect(() => { if (state?.success) ref.current?.reset(); }, [state]);
  if (!billId && !tenants.length) return <p className="text-sm text-muted-foreground">{t("inviteFirst")}</p>;
  return <form ref={ref} action={formAction} className="flex flex-col gap-3">
    {!billId && <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-title`}>{t("billTitle")}</Label>
        <Input id={`${id}-title`} name="title" required maxLength={200} placeholder={t("titlePlaceholder")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-tenant`}>{t("tenant")}</Label>
        <Select id={`${id}-tenant`} name="tenantShareId" required>
          {tenants.map(tenant => <option key={tenant.id} value={tenant.id}>{tenant.invited_email}</option>)}
        </Select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-amount`}>{t("amount")}</Label>
          <Input id={`${id}-amount`} name="amount" type="number" min="0.01" max="1000000000000" step="0.01" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-due`}>{t("dueDate")}</Label>
          <Input id={`${id}-due`} name="dueDate" type="date" required />
        </div>
      </div>
    </>}
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${id}-file`}>{t(billId ? "paymentProof" : "billCopy")}</Label>
      <Input id={`${id}-file`} name="file" type="file" accept={BILL_ACCEPT} required aria-describedby={`${id}-hint`} />
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">{t("fileHint")}</p>
    </div>
    {!billId && <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name="visible" defaultChecked className="size-4 accent-primary" />{t("visible")}
    </label>}
    {billId && <p className="text-xs text-muted-foreground">{t("approvalHint")}</p>}
    {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
    {state?.success && <p role="status" className="text-sm text-muted-foreground">{t(billId ? "proofSubmitted" : "billCreated")}</p>}
    <Button type="submit" disabled={pending} className="w-fit">{t(pending ? "saving" : billId ? "submitProof" : "createBill")}</Button>
  </form>;
}
