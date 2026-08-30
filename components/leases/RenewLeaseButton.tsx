"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { renewLease, type LeaseSubjectType } from "@/app/actions/leases";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function RenewLeaseButton({
  leaseId,
  subjectType,
  subjectId,
  currentEndDate,
}: {
  leaseId: string;
  subjectType: LeaseSubjectType;
  subjectId: string;
  currentEndDate: string | null;
}) {
  const t = useTranslations("LeaseSection");
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    renewLease.bind(null, leaseId, subjectType, subjectId),
    undefined,
  );

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" className="min-w-28">
          {t("renewLease")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("renewLease")}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newEndDate">{t("newEndDate")}</Label>
            <Input id="newEndDate" name="newEndDate" type="date" defaultValue={currentEndDate ?? ""} required />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? t("saving") : t("renewLease")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
