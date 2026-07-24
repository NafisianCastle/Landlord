import { notFound } from "next/navigation";
import type { Polygon } from "geojson";
import { createClient } from "@/lib/supabase/server";
import { updatePlotMetadata } from "@/app/actions/plots";
import { convertArea } from "@/lib/units";
import { polygonCentroid, googleMapsDirectionsUrl } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PlotMetadataForm from "@/components/plots/PlotMetadataForm";
import PlotBoundarySection from "@/components/plots/PlotBoundarySection";
import DocumentUploader from "@/components/documents/DocumentUploader";
import DocumentRow from "@/components/documents/DocumentRow";
import DeletePlotButton from "@/components/plots/DeletePlotButton";

export default async function PlotDetailPage({
  params,
}: {
  params: Promise<{ plotId: string }>;
}) {
  const { plotId } = await params;
  const supabase = await createClient();
  const [{ data: plot, error }, { data: documents }] = await Promise.all([
    supabase.from("land_plots").select("*").eq("id", plotId).single(),
    supabase
      .from("plot_documents")
      .select("id, file_name, storage_path, is_encrypted, encryption_iv")
      .eq("plot_id", plotId)
      .order("uploaded_at", { ascending: false }),
  ]);

  if (error && error.code !== "PGRST116") {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 p-6">
        <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          Couldn&rsquo;t load this plot — {error.message}. Try refreshing the page.
        </p>
      </div>
    );
  }

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
          <Button variant="link" size="sm" className="px-0" asChild>
            <a href={navigateUrl} target="_blank" rel="noopener noreferrer">
              Navigate here
            </a>
          </Button>
        )}
      </div>

      <PlotBoundarySection
        plotId={plot.id}
        plotName={plot.name}
        boundary={boundary}
      />

      {conversions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Area (from GPS boundary)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
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
            <p className="mt-2 text-xs text-muted-foreground">
              GPS-derived — walking/manual boundary drawing can introduce error. See dolil and
              actual measurements below for cross-check.
            </p>
          </CardContent>
        </Card>
      )}

      {(plot.dolil_area || plot.actual_area) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Dolil vs. actual measurement</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <li>
                {plot.dolil_area
                  ? `${plot.dolil_area} ${plot.dolil_area_unit ?? ""}`
                  : "—"}{" "}
                <span className="text-xs">(dolil)</span>
              </li>
              <li>
                {plot.actual_area
                  ? `${plot.actual_area} ${plot.actual_area_unit ?? ""}`
                  : "—"}{" "}
                <span className="text-xs">(actual)</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-2 font-medium">Details</h2>
        <Card>
          <CardContent className="pt-6">
            <PlotMetadataForm
              action={updatePlotMetadata.bind(null, plot.id)}
              initial={{
                name: plot.name,
                upazila: plot.upazila,
                district: plot.district,
                division: plot.division,
                dolilArea: plot.dolil_area,
                dolilAreaUnit: plot.dolil_area_unit,
                actualArea: plot.actual_area,
                actualAreaUnit: plot.actual_area_unit,
                sensitiveEncryptedHex: plot.sensitive_encrypted,
                sensitiveIvHex: plot.sensitive_iv,
                plaintext: {
                  village: plot.village,
                  mutationNumber: plot.mutation_number,
                  purchasePrice: plot.purchase_price,
                  purchaseDate: plot.purchase_date,
                  currentEstimatedValue: plot.current_estimated_value,
                  notes: plot.notes,
                },
              }}
              submitLabel="Save changes"
            />
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-2 font-medium">Documents</h2>
        <ul className="mb-3 divide-y divide-border rounded-lg border border-border px-3 py-1">
          {(documents ?? []).map((doc) => (
            <DocumentRow
              key={doc.id}
              plotId={plot.id}
              documentId={doc.id}
              storagePath={doc.storage_path}
              fileName={doc.file_name}
              isEncrypted={doc.is_encrypted}
              encryptionIvHex={doc.encryption_iv}
            />
          ))}
          {(!documents || documents.length === 0) && (
            <li className="py-2 text-sm text-muted-foreground">No documents yet.</li>
          )}
        </ul>
        <DocumentUploader plotId={plot.id} />
      </div>

      <DeletePlotButton plotId={plot.id} plotName={plot.name} />
    </div>
  );
}
