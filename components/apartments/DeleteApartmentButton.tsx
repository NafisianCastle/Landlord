"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteApartment } from "@/app/actions/apartments";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t("confirmDelete", { apartmentName }))) return;
          setError(null);
          startTransition(async () => {
            const result = await (onDelete ?? deleteApartment)(apartmentId);
            if (result?.error) setError(result.error);
          });
        }}
      >
        {pending ? t("deleting") : t("deleteApartment")}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
