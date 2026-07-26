"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { deleteApartmentDocument } from "@/app/actions/apartmentDocuments";
import { Button } from "@/components/ui/button";

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

  if (removed) return null;

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
          <Button
            type="button"
            variant="link"
            size="sm"
            className="text-destructive"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(t("confirmDelete", { fileName }))) return;
              setError(null);
              startTransition(async () => {
                try {
                  await deleteApartmentDocument(apartmentId, documentId, storagePath);
                  setRemoved(true);
                } catch {
                  setError(t("deleteFailed"));
                }
              });
            }}
          >
            {t("delete")}
          </Button>
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
