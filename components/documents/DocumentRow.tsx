"use client";

import { useState, useTransition } from "react";
import PdfPreviewModal from "./PdfPreviewModal";
import { deleteDocument } from "@/app/actions/documents";
import { Button } from "@/components/ui/button";

interface DocumentRowProps {
  plotId: string;
  documentId: string;
  storagePath: string;
  fileName: string;
}

export default function DocumentRow({
  plotId,
  documentId,
  storagePath,
  fileName,
}: DocumentRowProps) {
  const [pending, startTransition] = useTransition();
  const [removed, setRemoved] = useState(false);

  if (removed) return null;

  return (
    <li className="flex items-center justify-between gap-2 py-2">
      <span className="truncate text-sm">{fileName}</span>
      <div className="flex shrink-0 gap-3">
        <PdfPreviewModal storagePath={storagePath} fileName={fileName} />
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-destructive"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await deleteDocument(plotId, documentId, storagePath);
              setRemoved(true);
            })
          }
        >
          Delete
        </Button>
      </div>
    </li>
  );
}
