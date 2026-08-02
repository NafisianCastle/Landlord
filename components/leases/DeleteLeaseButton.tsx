"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteLease, type LeaseSubjectType } from "@/app/actions/leases";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ui/confirm-dialog";

export default function DeleteLeaseButton({
  leaseId,
  subjectType,
  subjectId,
}: {
  leaseId: string;
  subjectType: LeaseSubjectType;
  subjectId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("LeaseSection");
  const tCommon = useTranslations("Common");

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteLease(leaseId, subjectType, subjectId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <ConfirmDialog
        trigger={
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="min-w-32"
            disabled={pending}
          >
            {pending ? t("deleting") : t("deleteLease")}
          </Button>
        }
        title={t("deleteLease")}
        description={t("confirmDeleteLease")}
        confirmLabel={t("deleteLease")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleDelete}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
