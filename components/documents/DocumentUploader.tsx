"use client";

import { useActionState } from "react";
import { uploadDocument } from "@/app/actions/documents";
import { Button } from "@/components/ui/button";
import { encryptBytes, toPgBytea } from "@/lib/crypto/encryption";
import { getSessionDEK } from "@/lib/crypto/session";

export default function DocumentUploader({ plotId }: { plotId: string }) {
  const [state, formAction, pending] = useActionState(
    uploadDocument.bind(null, plotId),
    undefined,
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const dek = getSessionDEK();
    if (!dek) return; // plaintext path: let the form submit normally

    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;

    const { ciphertext, iv } = await encryptBytes(new Uint8Array(await file.arrayBuffer()), dek);

    const fd = new FormData(form);
    fd.set("file", new Blob([ciphertext.slice()], { type: "application/octet-stream" }), file.name);
    fd.set("originalFileName", file.name);
    fd.set("encryptionIvHex", toPgBytea(iv));
    formAction(fd);
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        name="file"
        type="file"
        accept="application/pdf"
        required
        className="text-sm text-foreground"
      />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" size="sm" disabled={pending} className="self-start">
        {pending ? "Uploading..." : "Upload document"}
      </Button>
    </form>
  );
}
