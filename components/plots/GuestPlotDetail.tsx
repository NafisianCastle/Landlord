"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  getGuestPlot,
  updateGuestPlotMetadata,
  saveGuestPlotBoundary,
  deleteGuestPlot,
  type GuestPlot,
} from "@/lib/offline/guestPlots";
import type { LatLng } from "@/lib/geo";
import { convertArea } from "@/lib/units";
import { polygonCentroid, googleMapsDirectionsUrl } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PlotMetadataForm from "@/components/plots/PlotMetadataForm";
import PlotBoundarySection from "@/components/plots/PlotBoundarySection";
import DeletePlotButton from "@/components/plots/DeletePlotButton";

export default function GuestPlotDetail({ plotId }: { plotId: string }) {
  const router = useRouter();
  const t = useTranslations("PlotDetailPage");
  const tGuest = useTranslations("GuestMode");
  const tPlotActions = useTranslations("PlotActions");
  const [plot, setPlot] = useState<GuestPlot | null | undefined>(undefined);

  const reload = useCallback(async () => {
    const found = await getGuestPlot(plotId);
    setPlot(found ?? null);
  }, [plotId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleSaveBoundary = useCallback(
    async (id: string, points: LatLng[]) => {
      const result = await saveGuestPlotBoundary(id, points);
      if (!result.error) await reload();
      return result;
    },
    [reload],
  );

  const handleUpdateMetadata = useCallback(
    async (_prevState: unknown, formData: FormData) => {
      const name = String(formData.get("name") ?? "").trim();
      if (!name) return { error: tPlotActions("plotNameRequired") };

      await updateGuestPlotMetadata(plotId, {
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
        purchasePrice: formData.get("purchasePrice")
          ? Number(formData.get("purchasePrice"))
          : null,
        purchaseDate: String(formData.get("purchaseDate") ?? "") || null,
        currentEstimatedValue: formData.get("currentEstimatedValue")
          ? Number(formData.get("currentEstimatedValue"))
          : null,
        notes: String(formData.get("notes") ?? "") || null,
      });
      await reload();
      return { success: true };
    },
    [plotId, reload, tPlotActions],
  );

  const handleDelete = useCallback(async (id: string) => {
    await deleteGuestPlot(id);
    router.push("/plots");
  }, [router]);

  if (plot === undefined) return null;
  if (plot === null) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
        <p className="text-sm text-muted-foreground">{tGuest("plotNotFound")}</p>
      </div>
    );
  }

  const boundary = plot.boundaryGeojson;
  const conversions = plot.areaSqMeters ? convertArea(plot.areaSqMeters) : null;
  const navigateUrl = boundary ? googleMapsDirectionsUrl(polygonCentroid(boundary)) : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">{plot.name}</h1>
        {navigateUrl && (
          <Button variant="link" size="sm" className="px-0" asChild>
            <a href={navigateUrl} target="_blank" rel="noopener noreferrer">
              {t("navigateHere")}
            </a>
          </Button>
        )}
      </div>

      <PlotBoundarySection
        plotId={plot.id}
        plotName={plot.name}
        boundary={boundary}
        onSaveBoundary={handleSaveBoundary}
      />

      {conversions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("areaFromGps")}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm text-muted-foreground sm:grid-cols-2">
              <li>{t("unitDecimal", { value: conversions.decimal.toFixed(2) })}</li>
              <li>{t("unitBigha", { value: conversions.bigha.toFixed(3) })}</li>
              <li>{t("unitKatha", { value: conversions.katha.toFixed(2) })}</li>
              <li>
                {t("unitKani", { value: conversions.kani.toFixed(2) })}{" "}
                <span className="text-xs">{t("regionalEst")}</span>
              </li>
              <li>
                {t("unitGonda", { value: conversions.gonda.toFixed(2) })}{" "}
                <span className="text-xs">{t("regionalEst")}</span>
              </li>
              <li>{t("unitAcre", { value: conversions.acre.toFixed(4) })}</li>
              <li>{t("unitSqFt", { value: conversions.sqFt.toFixed(0) })}</li>
              <li>{t("unitSqKm", { value: conversions.sqKm.toFixed(6) })}</li>
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">{t("gpsDerivedNotice")}</p>
          </CardContent>
        </Card>
      )}

      {(plot.dolilArea || plot.actualArea) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("dolilVsActual")}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm text-muted-foreground sm:grid-cols-2">
              <li>
                {plot.dolilArea ? `${plot.dolilArea} ${plot.dolilAreaUnit ?? ""}` : "—"}{" "}
                <span className="text-xs">{t("dolilLabel")}</span>
              </li>
              <li>
                {plot.actualArea ? `${plot.actualArea} ${plot.actualAreaUnit ?? ""}` : "—"}{" "}
                <span className="text-xs">{t("actualLabel")}</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-2 font-medium">{t("details")}</h2>
        <Card>
          <CardContent className="pt-6">
            <PlotMetadataForm
              action={handleUpdateMetadata}
              initial={{
                name: plot.name,
                upazila: plot.upazila,
                district: plot.district,
                division: plot.division,
                dolilArea: plot.dolilArea,
                dolilAreaUnit: plot.dolilAreaUnit,
                actualArea: plot.actualArea,
                actualAreaUnit: plot.actualAreaUnit,
                plaintext: {
                  village: plot.village,
                  mutationNumber: plot.mutationNumber,
                  purchasePrice: plot.purchasePrice,
                  purchaseDate: plot.purchaseDate,
                  currentEstimatedValue: plot.currentEstimatedValue,
                  notes: plot.notes,
                },
              }}
              submitLabel={t("saveChanges")}
            />
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-2 font-medium">{t("documents")}</h2>
        <p className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
          {tGuest("documentsRequireSignup")}
        </p>
      </div>

      <DeletePlotButton plotId={plot.id} plotName={plot.name} onDelete={handleDelete} />
    </div>
  );
}
