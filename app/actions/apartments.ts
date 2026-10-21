"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithAccess } from "@/lib/access";
import { UUID, validateProperty, validateForm } from "@/lib/validation/forms";
import { validateGuestProperties } from "@/lib/validation/guests";
import { apartmentLocation, validApartmentLocation, type ApartmentCoordinates } from "@/lib/apartmentLocation";

/**
 * building_name/unit_number/purchase_price/purchase_date/current_estimated_value/notes
 * are either written plaintext, or — when the client has encryption unlocked —
 * as one AES-GCM blob in sensitive_encrypted/sensitive_iv (see
 * lib/crypto/encryption.ts and ApartmentMetadataForm). Never both: whichever mode
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
      building_name: null,
      unit_number: null,
      purchase_price: null,
      purchase_date: null,
      current_estimated_value: null,
      notes: null,
    };
  }

  return {
    sensitive_encrypted: null,
    sensitive_iv: null,
    building_name: String(formData.get("buildingName") ?? "") || null,
    unit_number: String(formData.get("unitNumber") ?? "") || null,
    purchase_price: formData.get("purchasePrice") ? Number(formData.get("purchasePrice")) : null,
    purchase_date: String(formData.get("purchaseDate") ?? "") || null,
    current_estimated_value: formData.get("currentEstimatedValue")
      ? Number(formData.get("currentEstimatedValue"))
      : null,
    notes: String(formData.get("notes") ?? "") || null,
  };
}

function sizeFieldsFromForm(formData: FormData) {
  return {
    size: formData.get("size") ? Number(formData.get("size")) : null,
    size_unit: String(formData.get("sizeUnit") ?? "") || null,
  };
}

export async function createApartment(_prevState: unknown, formData: FormData) {
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");
  if (!auth.hasAccess) redirect("/paywall");
  const { user } = auth;

  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const t = await getTranslations("ApartmentActions");
  if (!name) return { error: t("apartmentNameRequired") };
  const validationError = validateProperty(formData);
  if (validationError) return { error: validationError };

  const { data, error } = await supabase
    .from("apartments")
    .insert({
      user_id: user.id,
      name,
      upazila: String(formData.get("upazila") ?? "") || null,
      district: String(formData.get("district") ?? "") || null,
      division: String(formData.get("division") ?? "") || null,
      floor: String(formData.get("floor") ?? "") || null,
      ...sizeFieldsFromForm(formData),
      ...sensitiveFieldsFromForm(formData),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  redirect(`/apartments/${data.id}`);
}

export interface GuestApartmentPayload {
  name: string;
  upazila: string | null;
  district: string | null;
  division: string | null;
  floor: string | null;
  size: number | null;
  sizeUnit: string | null;
  buildingName: string | null;
  unitNumber: string | null;
  purchasePrice: number | null;
  purchaseDate: string | null;
  currentEstimatedValue: number | null;
  notes: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Bulk-inserts apartments created in guest mode (local Dexie storage, see
 * lib/offline/guestApartments.ts) once the visitor has a real account —
 * guest data never touches Supabase until this point.
 */
export async function migrateGuestApartments(apartments: GuestApartmentPayload[]) {
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");
  if (!auth.hasAccess) return { migrated: 0 };
  const error = validateGuestProperties(apartments);
  if (error) return { migrated: 0, error };
  if (apartments.length === 0) return { migrated: 0 };

  const supabase = await createClient();
  let migrated = 0;

  for (const a of apartments) {
    const location = apartmentLocation(a.latitude, a.longitude);
    const { error } = await supabase.from("apartments").insert({
      user_id: auth.user.id,
      name: a.name,
      upazila: a.upazila,
      district: a.district,
      division: a.division,
      floor: a.floor,
      size: a.size,
      size_unit: a.sizeUnit,
      building_name: a.buildingName,
      unit_number: a.unitNumber,
      purchase_price: a.purchasePrice,
      purchase_date: a.purchaseDate,
      current_estimated_value: a.currentEstimatedValue,
      notes: a.notes,
      latitude: location?.lat ?? null,
      longitude: location?.lng ?? null,
    });

    if (error) continue;
    migrated += 1;
  }

  revalidatePath("/apartments");
  revalidatePath("/dashboard");
  return { migrated };
}

export async function updateApartmentMetadata(
  apartmentId: string,
  _prevState: unknown,
  formData: FormData,
) {
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");
  const t = await getTranslations("ApartmentActions");
  if (!auth.hasAccess) return { error: t("trialEnded") };

  const validationError = validateProperty(formData);
  if (validationError) return { error: validationError };

  const supabase = await createClient();

  const { error } = await supabase
    .from("apartments")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      upazila: String(formData.get("upazila") ?? "") || null,
      district: String(formData.get("district") ?? "") || null,
      division: String(formData.get("division") ?? "") || null,
      floor: String(formData.get("floor") ?? "") || null,
      ...sizeFieldsFromForm(formData),
      ...sensitiveFieldsFromForm(formData),
    })
    .eq("id", apartmentId);

  if (error) return { error: error.message };

  revalidatePath(`/apartments/${apartmentId}`);
  return { success: true };
}

export async function deleteApartment(apartmentId: string) {
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");
  if (!auth.hasAccess) redirect("/paywall");

  const supabase = await createClient();
  const { error } = await supabase.from("apartments").delete().eq("id", apartmentId);
  if (error) return { error: error.message };
  redirect("/apartments");
}

export async function saveApartmentLocation(apartmentId: string, point: ApartmentCoordinates | null) {
  const t = await getTranslations("ApartmentLocation");
  const auth = await getUserWithAccess();
  if (!auth?.hasAccess) return { error: t("accessDenied") };
  if (typeof apartmentId !== "string" || !UUID.test(apartmentId) || !validApartmentLocation(point))
    return { error: t("invalidCoordinates") };
  const supabase = await createClient();
  // Apartment UPDATE/SELECT RLS enforces owner/editor access, including forged calls.
  const { data, error } = await supabase.from("apartments")
    .update({ latitude: point?.lat ?? null, longitude: point?.lng ?? null })
    .eq("id", apartmentId).select("id").single();
  if (error || !data) return { error: t("saveFailed") };
  revalidatePath(`/apartments/${apartmentId}`);
  revalidatePath("/apartments");
  return { success: true };
}

export async function inviteApartmentCollaborator(
  apartmentId: string,
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
  const validationError = validateForm(formData, { email: { kind: "email", max: 254, required: true }, role: { choices: ["viewer", "editor"] } });
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { data: collaboratorId, error: lookupError } = await supabase.rpc(
    "find_user_id_by_email",
    { p_email: email },
  );
  if (lookupError) return { error: lookupError.message };
  if (!collaboratorId) return { error: t("noAccountFound") };
  if (collaboratorId === auth.user.id) return { error: t("cannotInviteSelf") };

  const { error } = await supabase.from("apartment_collaborators").insert({
    apartment_id: apartmentId,
    user_id: collaboratorId,
    invited_email: email,
    role,
    invited_by: auth.user.id,
  });

  if (error) {
    if (error.code === "23505") return { error: t("alreadyShared") };
    return { error: error.message };
  }

  const { error: logError } = await supabase.rpc("log_apartment_collaborator_audit", {
    p_apartment_id: apartmentId,
    p_action: "collaborator_invited",
    p_detail: { email, role },
  });
  if (logError) console.error("log_apartment_collaborator_audit failed:", logError.message);

  revalidatePath(`/apartments/${apartmentId}`);
  return { success: true };
}

export async function removeApartmentCollaborator(apartmentId: string, collaboratorId: string) {
  const auth = await getUserWithAccess();
  if (!auth) redirect("/login");

  const supabase = await createClient();
  const { data: collaborator } = await supabase
    .from("apartment_collaborators")
    .select("invited_email")
    .eq("id", collaboratorId)
    .single();

  const { error } = await supabase
    .from("apartment_collaborators")
    .delete()
    .eq("id", collaboratorId);
  if (error) return { error: error.message };

  const { error: logError } = await supabase.rpc("log_apartment_collaborator_audit", {
    p_apartment_id: apartmentId,
    p_action: "collaborator_removed",
    p_detail: { email: collaborator?.invited_email ?? null },
  });
  if (logError) console.error("log_apartment_collaborator_audit failed:", logError.message);

  revalidatePath(`/apartments/${apartmentId}`);
  return { success: true };
}
