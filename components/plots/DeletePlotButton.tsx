"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { deletePlot } from "@/app/actions/plots";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ui/confirm-dialog";

export default function DeletePlotButton({
  plotId,
  plotName,
  onDelete,
}: {
  plotId: string;
  plotName: string;
  /** Overridable so guest mode (no Supabase session) can delete locally instead. */
  onDelete?: (plotId: string) => Promise<{ error?: string } | void>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("DeletePlotButton");
  const tCommon = useTranslations("Common");

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await (onDelete ?? deletePlot)(plotId);
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
            {pending ? t("deleting") : t("deletePlot")}
          </Button>
        }
        title={t("deletePlot")}
        description={t("confirmDelete", { plotName })}
        confirmLabel={t("deletePlot")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleDelete}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
