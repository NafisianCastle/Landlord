"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { deleteDocument } from "@/app/actions/documents";
import { Button } from "@/components/ui/button";

const PdfPreviewModal = dynamic(() => import("./PdfPreviewModal"), { ssr: false });

interface DocumentRowProps {
  plotId: string;
  documentId: string;
  storagePath: string;
  fileName: string;
  isEncrypted?: boolean;
  encryptionIvHex?: string | null;
}

export default function DocumentRow({
  plotId,
  documentId,
  storagePath,
  fileName,
  isEncrypted,
  encryptionIvHex,
}: DocumentRowProps) {
  const [pending, startTransition] = useTransition();
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (removed) return null;

  return (
    <li className="flex flex-col gap-1 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm">{fileName}</span>
        <div className="flex shrink-0 gap-3">
          <PdfPreviewModal
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
              if (!window.confirm(`Delete "${fileName}"? This can't be undone.`)) return;
              setError(null);
              startTransition(async () => {
                try {
                  await deleteDocument(plotId, documentId, storagePath);
                  setRemoved(true);
                } catch {
                  setError("Couldn't delete this document. Try again.");
                }
              });
            }}
          >
            Delete
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
