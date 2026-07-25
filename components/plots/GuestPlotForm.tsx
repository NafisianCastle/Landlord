"use client";

import { useRouter } from "next/navigation";
import { createGuestPlot } from "@/lib/offline/guestPlots";
import PlotMetadataForm from "@/components/plots/PlotMetadataForm";

export default function GuestPlotForm({ submitLabel }: { submitLabel: string }) {
  const router = useRouter();

  async function createGuestPlotAction(_prevState: unknown, formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: "Plot name is required" };

    const plot = await createGuestPlot({
      name,
      upazila: String(formData.get("upazila") ?? "") || null,
      district: String(formData.get("district") ?? "") || null,
      division: String(formData.get("division") ?? "") || null,
      dolilArea: formData.get("dolilArea") ? Number(formData.get("dolilArea")) : null,
      dolilAreaUnit: String(formData.get("dolilAreaUnit") ?? "") || null,
      actualArea: formData.get("actualArea") ? Number(formData.get("actualArea")) : null,
      actualAreaUnit: String(formData.get("actualAreaUnit") ?? "") || null,
      village: String(formData.get("village") ?? "") || null,
      mutationNumber: String(formData.get("mutationNumber") ?? "") || null,
      purchasePrice: formData.get("purchasePrice") ? Number(formData.get("purchasePrice")) : null,
      purchaseDate: String(formData.get("purchaseDate") ?? "") || null,
      currentEstimatedValue: formData.get("currentEstimatedValue")
        ? Number(formData.get("currentEstimatedValue"))
        : null,
      notes: String(formData.get("notes") ?? "") || null,
    });

    router.push(`/plots/${plot.id}`);
    return undefined;
  }

  return <PlotMetadataForm action={createGuestPlotAction} submitLabel={submitLabel} />;
}
