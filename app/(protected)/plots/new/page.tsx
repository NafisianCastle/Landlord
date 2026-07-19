import { createPlot } from "@/app/actions/plots";
import PlotMetadataForm from "@/components/plots/PlotMetadataForm";

export default function NewPlotPage() {
  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-4 text-xl font-semibold">Add a plot</h1>
      <PlotMetadataForm action={createPlot} submitLabel="Create plot" />
    </div>
  );
}
