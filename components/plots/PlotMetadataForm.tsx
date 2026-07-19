"use client";

import { useActionState } from "react";

export interface PlotMetadataValues {
  name?: string;
  village?: string | null;
  upazila?: string | null;
  district?: string | null;
  division?: string | null;
  mutationNumber?: string | null;
  purchasePrice?: number | null;
  purchaseDate?: string | null;
  currentEstimatedValue?: number | null;
  notes?: string | null;
}

interface PlotMetadataFormProps {
  action: (prevState: unknown, formData: FormData) => Promise<{ error?: string } | undefined>;
  initial?: PlotMetadataValues;
  submitLabel: string;
}

export default function PlotMetadataForm({
  action,
  initial,
  submitLabel,
}: PlotMetadataFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        name="name"
        placeholder="Plot name (e.g. Behind grandfather's house)"
        defaultValue={initial?.name ?? ""}
        required
        className="rounded border px-3 py-2"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          name="village"
          placeholder="Village"
          defaultValue={initial?.village ?? ""}
          className="rounded border px-3 py-2"
        />
        <input
          name="upazila"
          placeholder="Upazila"
          defaultValue={initial?.upazila ?? ""}
          className="rounded border px-3 py-2"
        />
        <input
          name="district"
          placeholder="District"
          defaultValue={initial?.district ?? ""}
          className="rounded border px-3 py-2"
        />
        <input
          name="division"
          placeholder="Division"
          defaultValue={initial?.division ?? ""}
          className="rounded border px-3 py-2"
        />
      </div>
      <input
        name="mutationNumber"
        placeholder="Mutation number"
        defaultValue={initial?.mutationNumber ?? ""}
        className="rounded border px-3 py-2"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          name="purchasePrice"
          type="number"
          step="0.01"
          placeholder="Purchase price (BDT)"
          defaultValue={initial?.purchasePrice ?? ""}
          className="rounded border px-3 py-2"
        />
        <input
          name="purchaseDate"
          type="date"
          defaultValue={initial?.purchaseDate ?? ""}
          className="rounded border px-3 py-2"
        />
      </div>
      <input
        name="currentEstimatedValue"
        type="number"
        step="0.01"
        placeholder="Current estimated value (BDT)"
        defaultValue={initial?.currentEstimatedValue ?? ""}
        className="rounded border px-3 py-2"
      />
      <textarea
        name="notes"
        placeholder="Notes"
        defaultValue={initial?.notes ?? ""}
        className="rounded border px-3 py-2"
        rows={3}
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
