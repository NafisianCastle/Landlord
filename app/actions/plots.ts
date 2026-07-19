"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LatLng } from "@/lib/geo";
import { pointsToPolygon } from "@/lib/geo";

export async function createPlot(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Plot name is required" };

  const { data, error } = await supabase
    .from("land_plots")
    .insert({
      user_id: user.id,
      name,
      village: String(formData.get("village") ?? "") || null,
      upazila: String(formData.get("upazila") ?? "") || null,
      district: String(formData.get("district") ?? "") || null,
      division: String(formData.get("division") ?? "") || null,
      mutation_number: String(formData.get("mutationNumber") ?? "") || null,
      purchase_price: formData.get("purchasePrice")
        ? Number(formData.get("purchasePrice"))
        : null,
      purchase_date: String(formData.get("purchaseDate") ?? "") || null,
      current_estimated_value: formData.get("currentEstimatedValue")
        ? Number(formData.get("currentEstimatedValue"))
        : null,
      notes: String(formData.get("notes") ?? "") || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  redirect(`/plots/${data.id}`);
}

export async function updatePlotMetadata(
  plotId: string,
  _prevState: unknown,
  formData: FormData,
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("land_plots")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      village: String(formData.get("village") ?? "") || null,
      upazila: String(formData.get("upazila") ?? "") || null,
      district: String(formData.get("district") ?? "") || null,
      division: String(formData.get("division") ?? "") || null,
      mutation_number: String(formData.get("mutationNumber") ?? "") || null,
      purchase_price: formData.get("purchasePrice")
        ? Number(formData.get("purchasePrice"))
        : null,
      purchase_date: String(formData.get("purchaseDate") ?? "") || null,
      current_estimated_value: formData.get("currentEstimatedValue")
        ? Number(formData.get("currentEstimatedValue"))
        : null,
      notes: String(formData.get("notes") ?? "") || null,
    })
    .eq("id", plotId);

  if (error) return { error: error.message };

  revalidatePath(`/plots/${plotId}`);
  return { success: true };
}

export async function deletePlot(plotId: string) {
  const supabase = await createClient();
  await supabase.from("land_plots").delete().eq("id", plotId);
  redirect("/plots");
}

/**
 * Finalizes a walked boundary: builds a GeoJSON polygon from the tapped
 * points and writes it via the idempotent upsert_plot_boundary RPC (safe to
 * retry — full-replace by plot_id, single writer per plot).
 */
export async function savePlotBoundary(plotId: string, points: LatLng[]) {
  if (points.length < 3) {
    return { error: "Need at least 3 points to form a boundary" };
  }

  const supabase = await createClient();
  const polygon = pointsToPolygon(points);

  const { error } = await supabase.rpc("upsert_plot_boundary", {
    p_plot_id: plotId,
    p_geojson: polygon,
  });

  if (error) return { error: error.message };

  revalidatePath(`/plots/${plotId}`);
  revalidatePath("/plots");
  return { success: true };
}
