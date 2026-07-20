"use client";

import { useState, useTransition } from "react";
import PdfPreviewModal from "./PdfPreviewModal";
import { deleteDocument } from "@/app/actions/documents";

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
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await deleteDocument(plotId, documentId, storagePath);
              setRemoved(true);
            })
          }
          className="text-sm text-red-600 underline disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
