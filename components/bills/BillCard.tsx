"use client";

import { useActionState, useId, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { billStatus, type ApartmentBill, type BillProof } from "@/lib/bills";
import { reviewBillProof, setBillVisibility } from "@/app/actions/bills";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BillForm from "./BillForm";

function ReviewForm({ proofId, approve }: { proofId: string; approve: boolean }) {
  const t = useTranslations("Bills");
  const id = useId();
  const [state, action, pending] = useActionState(reviewBillProof.bind(null, proofId, approve), undefined);
  return <form action={action} className="flex flex-col gap-2">
    {!approve && <>
      <Label htmlFor={id}>{t("rejectionReason")}</Label>
      <Input id={id} name="note" required maxLength={1000} />
    </>}
    <Button type="submit" variant={approve ? "default" : "outline"} disabled={pending} className="w-fit">
      {t(pending ? "saving" : approve ? "approve" : "reject")}
    </Button>
    {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
  </form>;
}

export default function BillCard({ bill, proofs, isOwner, apartmentLabel }: {
  bill: ApartmentBill; proofs: BillProof[]; isOwner: boolean; apartmentLabel?: string;
}) {
  const t = useTranslations("Bills");
  const format = useFormatter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const status = billStatus(bill, proofs);
  return <article id={`bill-${bill.id}`} className="flex min-w-0 flex-col gap-4 rounded-xl border border-border p-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h3 className="break-words font-medium">{bill.title}</h3>
        {apartmentLabel && <p className="text-sm text-muted-foreground">{apartmentLabel}</p>}
        {isOwner && <p className="break-all text-xs text-muted-foreground">{bill.tenant_email}</p>}
      </div>
      <Badge variant={status === "overdue" ? "destructive" : "secondary"}>{t(`status.${status}`)}</Badge>
    </div>
    <p className="text-sm"><strong>{format.number(Number(bill.amount), { style: "currency", currency: "BDT" })}</strong>
      {" · "}{t("due", { date: bill.due_date })}</p>
    {bill.file_name && <a href={`/api/bills/files/${bill.id}`} target="_blank" rel="noopener noreferrer" className="w-fit break-all text-sm text-primary underline underline-offset-4">
      {t("viewBill")} · {bill.file_name}
    </a>}
    {isOwner && <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline">{t(bill.visible_to_tenant ? "shared" : "private")}</Badge>
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => {
        setError(null);
        startTransition(async () => {
          const result = await setBillVisibility(bill.id, !bill.visible_to_tenant);
          if (result.error) setError(result.error);
        });
      }}>{t(bill.visible_to_tenant ? "hide" : "share")}</Button>
      {!bill.tenant_share_id && <p className="text-xs text-muted-foreground">{t("tenantRemoved")}</p>}
    </div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {proofs.map(proof => <div key={proof.id} className="flex flex-col gap-3 rounded-lg bg-muted/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <a href={`/api/bills/files/${proof.id}?kind=proof`} target="_blank" rel="noopener noreferrer" className="min-w-0 break-all text-primary underline underline-offset-4">
          {t("viewProof")} · {proof.file_name}
        </a>
        <Badge variant="outline">{t(`proofStatus.${proof.status}`)}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">{format.dateTime(new Date(proof.created_at), { dateStyle: "medium", timeZone: "Asia/Dhaka" })}</p>
      {proof.review_note && <p className="break-words text-sm">{t("reviewNote", { note: proof.review_note })}</p>}
      {isOwner && proof.status === "pending" && !bill.paid_at && <div className="flex flex-col gap-3 border-t border-border pt-3">
        <ReviewForm proofId={proof.id} approve />
        <ReviewForm proofId={proof.id} approve={false} />
      </div>}
    </div>)}
    {!isOwner && !bill.paid_at && status !== "pending" && <details className="rounded-lg border border-border p-3">
      <summary className="cursor-pointer text-sm font-medium">{t("submitProof")}</summary>
      <div className="mt-3"><BillForm billId={bill.id} /></div>
    </details>}
    {!isOwner && status === "pending" && <p role="status" className="text-sm text-muted-foreground">{t("approvalHint")}</p>}
  </article>;
}
