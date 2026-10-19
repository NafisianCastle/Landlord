"use client";

import { useMemo } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "@/lib/pdfWorker";

export default function PdfDocument({ url, bytes, pageNumber, onLoadSuccess, onLoadError, loading }: {
  url: string | null;
  bytes: Uint8Array | null;
  pageNumber: number;
  onLoadSuccess: (pdf: { numPages: number }) => void;
  onLoadError: (error: Error) => void;
  loading: React.ReactNode;
}) {
  // A stable file object avoids restarting PDF.js loading during pagination.
  const file = useMemo(() => bytes ? { data: bytes } : url!, [bytes, url]);
  return (
    <Document file={file} onLoadSuccess={onLoadSuccess} onLoadError={onLoadError} loading={loading}>
      <Page pageNumber={pageNumber} width={420} />
    </Document>
  );
}
