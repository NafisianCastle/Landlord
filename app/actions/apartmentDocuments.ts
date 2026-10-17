"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithAccess } from "@/lib/access";
import { UUID } from "@/lib/validation/forms";
import { validateDocumentUpload } from "@/lib/validation/documents";

const BUCKET = "apartment-documents";

export async function uploadApartmentDocument(
  apartmentId: string,
  _prevState: unknown,
  formData: FormData,
) {
  const t = await getTranslations("DocumentActions");
  const auth = await getUserWithAccess();
  if (!auth) return { error: t("notSignedIn") };
  if (!auth.hasAccess) return { error: t("trialEnded") };
  const { user } = auth;

  const supabase = await createClient();

  if (typeof apartmentId !== "string" || !UUID.test(apartmentId)) return { error: "Invalid property ID." };
  const validated = await validateDocumentUpload(formData);
  if ("error" in validated) return { error: t(validated.error) };
  const { file, fileName, isEncrypted, iv, contentType } = validated;
  // Keep user-controlled filenames out of object keys.
  const storagePath = `${user.id}/${apartmentId}/${crypto.randomUUID()}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType });
  if (uploadError) return { error: uploadError.message };

  const { error: insertError } = await supabase.from("apartment_documents").insert({
    apartment_id: apartmentId,
    user_id: user.id,
    storage_path: storagePath,
    file_name: fileName,
    file_size_bytes: file.size,
    mime_type: isEncrypted ? "application/pdf" : file.type,
    is_encrypted: isEncrypted,
    encryption_iv: iv,
  });
  if (insertError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return { error: insertError.message };
  }

  revalidatePath(`/apartments/${apartmentId}`);
  return { success: true };
}

export async function deleteApartmentDocument(
  apartmentId: string,
  documentId: string,
  storagePath: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: doc } = await supabase
    .from("apartment_documents")
    .select("id, storage_path")
    .eq("id", documentId)
    .eq("apartment_id", apartmentId)
    .single();
  if (!doc || doc.storage_path !== storagePath) {
    throw new Error("Document not found");
  }

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (storageError) throw new Error(storageError.message);

  const { error: dbError } = await supabase
    .from("apartment_documents")
    .delete()
    .eq("id", documentId);
  if (dbError) throw new Error(dbError.message);

  revalidatePath(`/apartments/${apartmentId}`);
}

export async function getApartmentDocumentPreviewUrl(storagePath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60);
  if (error) return { error: error.message };
  return { url: data.signedUrl };
}
