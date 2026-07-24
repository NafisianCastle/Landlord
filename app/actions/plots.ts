"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserWithAccess } from "@/lib/access";
import type { LatLng } from "@/lib/geo";
import { pointsToPolygon } from "@/lib/geo";

/**
 * village/mutation_number/purchase_price/purchase_date/current_estimated_value/notes
 * are either written plaintext, or — when the client has encryption unlocked —
 * as one AES-GCM blob in sensitive_encrypted/sensitive_iv (see
 * lib/crypto/encryption.ts and PlotMetadataForm). Never both: whichever mode
 * the client submitted in, the other representation is cleared so a stale
 * plaintext copy can't linger after a switch to encrypted.
 */
function sensitiveFieldsFromForm(formData: FormData) {
  const encryptedHex = formData.get("sensitiveEncryptedHex");
  const ivHex = formData.get("sensitiveIvHex");

  if (typeof encryptedHex === "string" && typeof ivHex === "string" && encryptedHex) {
    return {
      sensitive_encrypted: encryptedHex,
      sensitive_iv: ivHex,
      village: null,
      mutation_number: null,
      purchase_price: null,
      purchase_date: null,
      current_estimated_value: null,
      notes: null,
    };
  }

  return {
    sensitive_encrypted: null,
    sensitive_iv: null,
    village: String(formData.get("village") ?? "") || null,
    mutation_number: String(formData.get("mutationNumber") ?? "") || null,
    purchase_price: formData.get("purchasePrice") ? Number(formData.get("purchasePrice")) : null,
    purchase_date: String(formData.get("purchaseDate") ?? "") || null,
    current_estimated_value: formData.get("currentEstimatedValue")
      ? Number(formData.get("currentEstimatedValue"))
      : null,
    notes: String(formData.get("notes") ?? "") || null,
  };
}

export async function createPlot(_prevState: unknown, formData: FormData) {
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");
  if (!auth.hasAccess) redirect("/paywall");
  const { user } = auth;

  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Plot name is required" };

  const { data, error } = await supabase
    .from("land_plots")
    .insert({
      user_id: user.id,
      name,
      upazila: String(formData.get("upazila") ?? "") || null,
      district: String(formData.get("district") ?? "") || null,
      division: String(formData.get("division") ?? "") || null,
      ...sensitiveFieldsFromForm(formData),
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
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");
  if (!auth.hasAccess) return { error: "Your trial has ended — please upgrade to continue." };

  const supabase = await createClient();

  const { error } = await supabase
    .from("land_plots")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      upazila: String(formData.get("upazila") ?? "") || null,
      district: String(formData.get("district") ?? "") || null,
      division: String(formData.get("division") ?? "") || null,
      ...sensitiveFieldsFromForm(formData),
    })
    .eq("id", plotId);

  if (error) return { error: error.message };

  revalidatePath(`/plots/${plotId}`);
  return { success: true };
}

export async function deletePlot(plotId: string) {
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");
  if (!auth.hasAccess) redirect("/paywall");

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
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");
  if (!auth.hasAccess) return { error: "Your trial has ended — please upgrade to continue." };

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
