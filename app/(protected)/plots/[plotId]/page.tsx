import { notFound } from "next/navigation";
import type { Polygon } from "geojson";
import { createClient } from "@/lib/supabase/server";
import { updatePlotMetadata, deletePlot } from "@/app/actions/plots";
import { convertArea } from "@/lib/units";
import { polygonCentroid, googleMapsDirectionsUrl } from "@/lib/geo";
import PlotMetadataForm from "@/components/plots/PlotMetadataForm";
import PlotBoundarySection from "@/components/plots/PlotBoundarySection";

export default async function PlotDetailPage({
  params,
}: {
  params: Promise<{ plotId: string }>;
}) {
  const { plotId } = await params;
  const supabase = await createClient();
  const { data: plot } = await supabase
    .from("land_plots")
    .select("*")
    .eq("id", plotId)
    .single();

  if (!plot) notFound();

  const boundary = plot.boundary_geojson as Polygon | null;
  const conversions = plot.area_sq_meters ? convertArea(plot.area_sq_meters) : null;
  const navigateUrl = boundary
    ? googleMapsDirectionsUrl(polygonCentroid(boundary))
    : null;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">{plot.name}</h1>
        {navigateUrl && (
          <a
            href={navigateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 underline"
          >
            Navigate here
          </a>
        )}
      </div>

      <PlotBoundarySection
        plotId={plot.id}
        plotName={plot.name}
        boundary={boundary}
      />

      {conversions && (
        <div className="rounded border p-3 text-sm">
          <p className="font-medium">Area</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-neutral-700">
            <li>{conversions.decimal.toFixed(2)} decimal</li>
            <li>{conversions.bigha.toFixed(3)} bigha</li>
            <li>{conversions.katha.toFixed(2)} katha</li>
            <li>
              {conversions.kani.toFixed(2)} kani <span className="text-xs">(regional est.)</span>
            </li>
            <li>
              {conversions.gonda.toFixed(2)} gonda <span className="text-xs">(regional est.)</span>
            </li>
            <li>{conversions.acre.toFixed(4)} acre</li>
            <li>{conversions.sqFt.toFixed(0)} sq ft</li>
            <li>{conversions.sqKm.toFixed(6)} sq km</li>
          </ul>
        </div>
      )}

      <div>
        <h2 className="mb-2 font-medium">Details</h2>
        <PlotMetadataForm
          action={updatePlotMetadata.bind(null, plot.id)}
          initial={{
            name: plot.name,
            village: plot.village,
            upazila: plot.upazila,
            district: plot.district,
            division: plot.division,
            mutationNumber: plot.mutation_number,
            purchasePrice: plot.purchase_price,
            purchaseDate: plot.purchase_date,
            currentEstimatedValue: plot.current_estimated_value,
            notes: plot.notes,
          }}
          submitLabel="Save changes"
        />
      </div>

      <form action={deletePlot.bind(null, plot.id)}>
        <button type="submit" className="text-sm text-red-600 underline">
          Delete plot
        </button>
      </form>
    </div>
  );
}
