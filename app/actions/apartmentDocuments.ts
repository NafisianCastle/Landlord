"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithAccess } from "@/lib/access";

const BUCKET = "apartment-documents";
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

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

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: t("choosePdf") };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { error: t("fileTooLarge") };
  }

  const encryptionIvHex = formData.get("encryptionIvHex");
  const isEncrypted = typeof encryptionIvHex === "string" && encryptionIvHex.length > 0;
  if (!isEncrypted && file.type !== "application/pdf") {
    return { error: t("onlyPdf") };
  }

  const fileName =
    (isEncrypted ? String(formData.get("originalFileName") ?? "") : "") || file.name;
  const storagePath = `${user.id}/${apartmentId}/${crypto.randomUUID()}-${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const { error: insertError } = await supabase.from("apartment_documents").insert({
    apartment_id: apartmentId,
    user_id: user.id,
    storage_path: storagePath,
    file_name: fileName,
    file_size_bytes: file.size,
    mime_type: isEncrypted ? "application/pdf" : file.type,
    is_encrypted: isEncrypted,
    encryption_iv: isEncrypted ? encryptionIvHex : null,
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
