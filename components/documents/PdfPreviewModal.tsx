"use client";

import { useState } from "react";
import { Document, Page } from "react-pdf";
import "@/lib/pdfWorker";
import { getDocumentPreviewUrl } from "@/app/actions/documents";

interface PdfPreviewModalProps {
  storagePath: string;
  fileName: string;
}

export default function PdfPreviewModal({ storagePath, fileName }: PdfPreviewModalProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);

  async function openPreview() {
    setOpen(true);
    setError(null);
    const result = await getDocumentPreviewUrl(storagePath);
    if (result.error) setError(result.error);
    else setUrl(result.url ?? null);
  }

  function close() {
    setOpen(false);
    setUrl(null);
    setPageNumber(1);
  }

  return (
    <>
      <button type="button" onClick={openPreview} className="text-sm text-blue-600 underline">
        Preview
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-full w-full max-w-lg flex-col gap-2 rounded bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="truncate text-sm font-medium">{fileName}</span>
              <button type="button" onClick={close} className="text-sm underline">
                Close
              </button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {url && (
              <div className="flex flex-col items-center gap-2 overflow-auto">
                <Document
                  file={url}
                  onLoadSuccess={({ numPages: n }) => setNumPages(n)}
                  onLoadError={(e) => setError(e.message)}
                  loading={<p className="text-sm text-neutral-600">Loading PDF...</p>}
                >
                  <Page pageNumber={pageNumber} width={420} />
                </Document>
                {numPages > 1 && (
                  <div className="flex items-center gap-3 text-sm">
                    <button
                      type="button"
                      onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                      disabled={pageNumber <= 1}
                      className="underline disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span>
                      Page {pageNumber} of {numPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
                      disabled={pageNumber >= numPages}
                      className="underline disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
