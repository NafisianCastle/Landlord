"use client";

import { useActionState } from "react";
import { uploadDocument } from "@/app/actions/documents";
import { Button } from "@/components/ui/button";

export default function DocumentUploader({ plotId }: { plotId: string }) {
  const [state, formAction, pending] = useActionState(
    uploadDocument.bind(null, plotId),
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
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
