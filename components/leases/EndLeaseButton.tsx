"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { endLease, type LeaseSubjectType } from "@/app/actions/leases";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ui/confirm-dialog";

export default function EndLeaseButton({
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

  function handleEnd() {
    setError(null);
    startTransition(async () => {
      const result = await endLease(leaseId, subjectType, subjectId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <ConfirmDialog
        trigger={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-w-28"
            disabled={pending}
          >
            {pending ? t("ending") : t("endLease")}
          </Button>
        }
        title={t("endLease")}
        description={t("confirmEndLease")}
        confirmLabel={t("endLease")}
        cancelLabel={tCommon("cancel")}
        destructive={false}
        onConfirm={handleEnd}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
