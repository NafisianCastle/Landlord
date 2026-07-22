"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Plot name</Label>
        <Input
          id="name"
          name="name"
          placeholder="e.g. Behind grandfather's house"
          defaultValue={initial?.name ?? ""}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="village">Village</Label>
          <Input id="village" name="village" defaultValue={initial?.village ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="upazila">Upazila</Label>
          <Input id="upazila" name="upazila" defaultValue={initial?.upazila ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="district">District</Label>
          <Input id="district" name="district" defaultValue={initial?.district ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="division">Division</Label>
          <Input id="division" name="division" defaultValue={initial?.division ?? ""} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mutationNumber">Mutation number</Label>
        <Input
          id="mutationNumber"
          name="mutationNumber"
          defaultValue={initial?.mutationNumber ?? ""}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="purchasePrice">Purchase price (BDT)</Label>
          <Input
            id="purchasePrice"
            name="purchasePrice"
            type="number"
            step="0.01"
            defaultValue={initial?.purchasePrice ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="purchaseDate">Purchase date</Label>
          <Input
            id="purchaseDate"
            name="purchaseDate"
            type="date"
            defaultValue={initial?.purchaseDate ?? ""}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="currentEstimatedValue">Current estimated value (BDT)</Label>
        <Input
          id="currentEstimatedValue"
          name="currentEstimatedValue"
          type="number"
          step="0.01"
          defaultValue={initial?.currentEstimatedValue ?? ""}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={initial?.notes ?? ""} rows={3} />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
