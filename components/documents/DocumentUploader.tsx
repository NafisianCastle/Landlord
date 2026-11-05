"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { uploadDocument } from "@/app/actions/documents";
import { Button } from "@/components/ui/button";
import { encryptBytes, toPgBytea } from "@/lib/crypto/encryption";
import { getSessionDEK } from "@/lib/crypto/session";
import { validatePdf } from "@/lib/validation/documents";

export default function DocumentUploader({ plotId }: { plotId: string }) {
  const [state, formAction, pending] = useActionState(
    uploadDocument.bind(null, plotId),
    undefined,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const t = useTranslations("DocumentUploader");
  const validationMessages = useTranslations("DocumentActions");
  const [clientError, setClientError] = useState<string | null>(null);

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state?.success) setSelectedFile(null);
  }

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setClientError(null);
    const dek = getSessionDEK();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;
    const validationError = await validatePdf(file);
    if (validationError) {
      setClientError(validationMessages(validationError));
      return;
    }
    const fd = new FormData(form);
    if (!dek) {
      startTransition(() => formAction(fd));
      return;
    }

    const { ciphertext, iv } = await encryptBytes(new Uint8Array(await file.arrayBuffer()), dek);

    fd.set("file", new Blob([ciphertext.slice()], { type: "application/octet-stream" }), file.name);
    fd.set("originalFileName", file.name);
    fd.set("encryptionIvHex", toPgBytea(iv));
    startTransition(() => formAction(fd));
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        name="file"
        type="file"
        accept="application/pdf"
        required
        onChange={(e) => { setSelectedFile(e.target.files?.[0] ?? null); setClientError(null); }}
        className="text-sm text-foreground"
      />
      {clientError && <p className="text-sm text-destructive">{clientError}</p>}
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-muted-foreground">{t("uploaded")}</p>}
      <Button type="submit" size="sm" disabled={pending} className="self-start">
        {pending
          ? selectedFile
            ? t("uploadingWithSize", { size: (selectedFile.size / 1024 / 1024).toFixed(1) })
            : t("uploading")
          : t("uploadDocument")}
      </Button>
    </form>
  );
}
