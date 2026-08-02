"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithAccess } from "@/lib/access";
import type { Polygon } from "geojson";
import type { LatLng } from "@/lib/geo";
import { isSimplePolygon, pointsToPolygon } from "@/lib/geo";

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

function areaFieldsFromForm(formData: FormData) {
  return {
    dolil_area: formData.get("dolilArea") ? Number(formData.get("dolilArea")) : null,
    dolil_area_unit: String(formData.get("dolilAreaUnit") ?? "") || null,
    actual_area: formData.get("actualArea") ? Number(formData.get("actualArea")) : null,
    actual_area_unit: String(formData.get("actualAreaUnit") ?? "") || null,
  };
}

export async function createPlot(_prevState: unknown, formData: FormData) {
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");
  if (!auth.hasAccess) redirect("/paywall");
  const { user } = auth;

  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const t = await getTranslations("PlotActions");
  if (!name) return { error: t("plotNameRequired") };

  const { data: sessionCheck } = await supabase.auth.getSession();
  console.log("[createPlot] user.id", user.id, "session.user.id", sessionCheck.session?.user.id, "has session", !!sessionCheck.session);

  const { data, error } = await supabase
    .from("land_plots")
    .insert({
      user_id: user.id,
      name,
      upazila: String(formData.get("upazila") ?? "") || null,
      district: String(formData.get("district") ?? "") || null,
      division: String(formData.get("division") ?? "") || null,
      ...areaFieldsFromForm(formData),
      ...sensitiveFieldsFromForm(formData),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  redirect(`/plots/${data.id}`);
}

export interface GuestPlotPayload {
  name: string;
  upazila: string | null;
  district: string | null;
  division: string | null;
  dolilArea: number | null;
  dolilAreaUnit: string | null;
  actualArea: number | null;
  actualAreaUnit: string | null;
  village: string | null;
  mutationNumber: string | null;
  purchasePrice: number | null;
  purchaseDate: string | null;
  currentEstimatedValue: number | null;
  notes: string | null;
  boundaryGeojson: Polygon | null;
}

/**
 * Bulk-inserts plots created in guest mode (local Dexie storage, see
 * lib/offline/guestPlots.ts) once the visitor has a real account — guest data
 * never touches Supabase until this point. `boundary`/`area_sq_meters` are
 * trigger-derived from the PostGIS `boundary` column (see migration 0004), so
 * a walked/drawn boundary is written afterwards via the same
 * `upsert_plot_boundary` RPC `savePlotBoundary` uses, not inserted directly.
 */
export async function migrateGuestPlots(plots: GuestPlotPayload[]) {
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");
  if (!auth.hasAccess || plots.length === 0) return { migrated: 0 };

  const supabase = await createClient();
  let migrated = 0;

  // Sequential, not Promise.all(insert-many) + bulk .select("id") — insert
  // order isn't guaranteed to match the returned row order, and each plot's
  // boundary must go to the row it actually belongs to.
  for (const p of plots) {
    const { data, error } = await supabase
      .from("land_plots")
      .insert({
        user_id: auth.user.id,
        name: p.name,
        upazila: p.upazila,
        district: p.district,
        division: p.division,
        dolil_area: p.dolilArea,
        dolil_area_unit: p.dolilAreaUnit,
        actual_area: p.actualArea,
        actual_area_unit: p.actualAreaUnit,
        village: p.village,
        mutation_number: p.mutationNumber,
        purchase_price: p.purchasePrice,
        purchase_date: p.purchaseDate,
        current_estimated_value: p.currentEstimatedValue,
        notes: p.notes,
      })
      .select("id")
      .single();

    if (error || !data) continue;

    if (p.boundaryGeojson) {
      await supabase.rpc("upsert_plot_boundary", {
        p_plot_id: data.id,
        p_geojson: p.boundaryGeojson,
      });
    }
    migrated += 1;
  }

  revalidatePath("/plots");
  revalidatePath("/dashboard");
  return { migrated };
}

export async function updatePlotMetadata(
  plotId: string,
  _prevState: unknown,
  formData: FormData,
) {
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");
  const t = await getTranslations("PlotActions");
  if (!auth.hasAccess) return { error: t("trialEnded") };

  const supabase = await createClient();

  const { error } = await supabase
    .from("land_plots")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      upazila: String(formData.get("upazila") ?? "") || null,
      district: String(formData.get("district") ?? "") || null,
      division: String(formData.get("division") ?? "") || null,
      ...areaFieldsFromForm(formData),
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
  const { error } = await supabase.from("land_plots").delete().eq("id", plotId);
  if (error) return { error: error.message };
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
  const t = await getTranslations("PlotActions");
  if (!auth.hasAccess) return { error: t("trialEnded") };

  if (points.length < 3) {
    return { error: t("needThreePoints") };
  }
  if (!isSimplePolygon(points)) {
    return { error: t("invalidPolygon") };
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

export async function inviteCollaborator(
  plotId: string,
  _prevState: unknown,
  formData: FormData,
) {
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");
  const t = await getTranslations("PlotCollaborators");
  if (!auth.hasAccess) return { error: t("trialEnded") };

  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "editor");
  if (!email) return { error: t("emailRequired") };
  if (role !== "viewer" && role !== "editor") return { error: t("invalidRole") };

  const supabase = await createClient();
  const { data: collaboratorId, error: lookupError } = await supabase.rpc(
    "find_user_id_by_email",
    { p_email: email },
  );
  if (lookupError) return { error: lookupError.message };
  if (!collaboratorId) return { error: t("noAccountFound") };
  if (collaboratorId === auth.user.id) return { error: t("cannotInviteSelf") };

  const { error } = await supabase.from("plot_collaborators").insert({
    plot_id: plotId,
    user_id: collaboratorId,
    invited_email: email,
    role,
    invited_by: auth.user.id,
  });

  if (error) {
    if (error.code === "23505") return { error: t("alreadyShared") };
    return { error: error.message };
  }

  const { error: logError } = await supabase.rpc("log_plot_collaborator_audit", {
    p_plot_id: plotId,
    p_action: "collaborator_invited",
    p_detail: { email, role },
  });
  if (logError) console.error("log_plot_collaborator_audit failed:", logError.message);

  revalidatePath(`/plots/${plotId}`);
  return { success: true };
}

export async function removeCollaborator(plotId: string, collaboratorId: string) {
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");

  const supabase = await createClient();
  const { data: collaborator } = await supabase
    .from("plot_collaborators")
    .select("invited_email")
    .eq("id", collaboratorId)
    .single();

  const { error } = await supabase
    .from("plot_collaborators")
    .delete()
    .eq("id", collaboratorId);
  if (error) return { error: error.message };

  const { error: logError } = await supabase.rpc("log_plot_collaborator_audit", {
    p_plot_id: plotId,
    p_action: "collaborator_removed",
    p_detail: { email: collaborator?.invited_email ?? null },
  });
  if (logError) console.error("log_plot_collaborator_audit failed:", logError.message);

  revalidatePath(`/plots/${plotId}`);
  return { success: true };
}
