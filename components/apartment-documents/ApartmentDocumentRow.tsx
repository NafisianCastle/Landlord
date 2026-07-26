"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { deleteApartmentDocument } from "@/app/actions/apartmentDocuments";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ui/confirm-dialog";

const ApartmentPdfPreviewModal = dynamic(() => import("./ApartmentPdfPreviewModal"), {
  ssr: false,
});

interface ApartmentDocumentRowProps {
  apartmentId: string;
  documentId: string;
  storagePath: string;
  fileName: string;
  isEncrypted?: boolean;
  encryptionIvHex?: string | null;
}

export default function ApartmentDocumentRow({
  apartmentId,
  documentId,
  storagePath,
  fileName,
  isEncrypted,
  encryptionIvHex,
}: ApartmentDocumentRowProps) {
  const [pending, startTransition] = useTransition();
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("DocumentRow");
  const tCommon = useTranslations("Common");

  if (removed) return null;

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteApartmentDocument(apartmentId, documentId, storagePath);
        setRemoved(true);
      } catch {
        setError(t("deleteFailed"));
      }
    });
  }

  return (
    <li className="flex flex-col gap-1 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm">{fileName}</span>
        <div className="flex shrink-0 gap-3">
          <ApartmentPdfPreviewModal
            storagePath={storagePath}
            fileName={fileName}
            isEncrypted={isEncrypted}
            encryptionIvHex={encryptionIvHex}
          />
          <ConfirmDialog
            trigger={
              <Button
                type="button"
                variant="link"
                size="sm"
                className="text-destructive"
                disabled={pending}
              >
                {t("delete")}
              </Button>
            }
            title={t("delete")}
            description={t("confirmDelete", { fileName })}
            confirmLabel={t("delete")}
            cancelLabel={tCommon("cancel")}
            onConfirm={handleDelete}
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}
