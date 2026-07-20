"use client";

import { useActionState } from "react";
import { uploadDocument } from "@/app/actions/documents";

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
        className="text-sm"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "Uploading..." : "Upload document"}
      </button>
    </form>
  );
}
