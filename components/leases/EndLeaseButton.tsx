"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { endLease, type LeaseSubjectType } from "@/app/actions/leases";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t("confirmEndLease"))) return;
          setError(null);
          startTransition(async () => {
            const result = await endLease(leaseId, subjectType, subjectId);
            if (result?.error) setError(result.error);
          });
        }}
      >
        {pending ? t("ending") : t("endLease")}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
