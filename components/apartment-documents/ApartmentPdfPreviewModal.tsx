"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Eye, X } from "lucide-react";
import { getApartmentDocumentPreviewUrl } from "@/app/actions/apartmentDocuments";
import { decryptBytes, fromPgBytea } from "@/lib/crypto/encryption";
import { getSessionDEK } from "@/lib/crypto/session";
import { Button } from "@/components/ui/button";

const PdfDocument = dynamic(() => import("@/components/documents/PdfDocument"), { ssr: false });

interface ApartmentPdfPreviewModalProps {
  storagePath: string;
  fileName: string;
  isEncrypted?: boolean;
  encryptionIvHex?: string | null;
}

export default function ApartmentPdfPreviewModal({
  storagePath,
  fileName,
  isEncrypted,
  encryptionIvHex,
}: ApartmentPdfPreviewModalProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(false);
  const t = useTranslations("PdfPreviewModal");

  async function openPreview() {
    setOpen(true);
    setError(null);
    setLoading(true);

    if (isEncrypted) {
      const dek = getSessionDEK();
      if (!dek) {
        setError(t("unlockEncryption"));
        setLoading(false);
        return;
      }
      const result = await getApartmentDocumentPreviewUrl(storagePath);
      if (result.error || !result.url) {
        setError(result.error ?? t("couldntLoad"));
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(result.url);
        const ciphertext = new Uint8Array(await res.arrayBuffer());
        const plaintext = await decryptBytes(ciphertext, fromPgBytea(encryptionIvHex!), dek);
        setBytes(plaintext);
      } catch {
        setError(t("decryptError"));
      } finally {
        setLoading(false);
      }
      return;
    }

    const result = await getApartmentDocumentPreviewUrl(storagePath);
    if (result.error) setError(result.error);
    else setUrl(result.url ?? null);
    setLoading(false);
  }

  function close() {
    setOpen(false);
    setUrl(null);
    setBytes(null);
    setPageNumber(1);
  }

  return (
    <>
      <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={openPreview}>
        <Eye className="size-4" />
        {t("preview")}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-full w-full max-w-lg flex-col gap-2 rounded bg-card p-4 text-card-foreground">
            <div className="flex items-center justify-between">
              <span className="truncate text-sm font-medium">{fileName}</span>
              <Button type="button" variant="ghost" size="sm" onClick={close}>
                <X className="size-4" />
                {t("close")}
              </Button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {loading && !error && (
              <p className="text-sm text-muted-foreground">{t("loadingDocument")}</p>
            )}

            {(url || bytes) && (
              <div className="flex flex-col items-center gap-2 overflow-auto">
                <PdfDocument
                  url={url}
                  bytes={bytes}
                  pageNumber={pageNumber}
                  onLoadSuccess={({ numPages: n }) => setNumPages(n)}
                  onLoadError={(e) => setError(e.message)}
                  loading={<p className="text-sm text-muted-foreground">{t("loadingPdf")}</p>}
                />
                {numPages > 1 && (
                  <div className="flex items-center gap-3 text-sm">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                      disabled={pageNumber <= 1}
                    >
                      <ChevronLeft className="size-4" />
                      {t("prev")}
                    </Button>
                    <span>{t("pageOf", { page: pageNumber, total: numPages })}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
                      disabled={pageNumber >= numPages}
                    >
                      {t("next")}
                      <ChevronRight className="size-4" />
                    </Button>
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
