"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteApartment } from "@/app/actions/apartments";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ui/confirm-dialog";

export default function DeleteApartmentButton({
  apartmentId,
  apartmentName,
  onDelete,
}: {
  apartmentId: string;
  apartmentName: string;
  /** Overridable so guest mode (no Supabase session) can delete locally instead. */
  onDelete?: (apartmentId: string) => Promise<{ error?: string } | void>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("DeleteApartmentButton");
  const tCommon = useTranslations("Common");

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await (onDelete ?? deleteApartment)(apartmentId);
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
            {pending ? t("deleting") : t("deleteApartment")}
          </Button>
        }
        title={t("deleteApartment")}
        description={t("confirmDelete", { apartmentName })}
        confirmLabel={t("deleteApartment")}
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
