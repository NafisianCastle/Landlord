"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { deletePlot } from "@/app/actions/plots";
import { Button } from "@/components/ui/button";

export default function DeletePlotButton({
  plotId,
  plotName,
}: {
  plotId: string;
  plotName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("DeletePlotButton");

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t("confirmDelete", { plotName }))) return;
          setError(null);
          startTransition(async () => {
            const result = await deletePlot(plotId);
            if (result?.error) setError(result.error);
          });
        }}
      >
        {pending ? t("deleting") : t("deletePlot")}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
