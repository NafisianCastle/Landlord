"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserWithAccess } from "@/lib/access";

const BUCKET = "land-documents";
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export async function uploadDocument(
  plotId: string,
  _prevState: unknown,
  formData: FormData,
) {
  const auth = await getUserWithAccess();
  if (!auth) return { error: "Not signed in" };
  if (!auth.hasAccess) return { error: "Your trial has ended — please upgrade to continue." };
  const { user } = auth;

  const supabase = await createClient();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a PDF file" };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { error: "File is too large — max 20 MB." };
  }

  const encryptionIvHex = formData.get("encryptionIvHex");
  const isEncrypted = typeof encryptionIvHex === "string" && encryptionIvHex.length > 0;
  // When encrypted, `file` is ciphertext (opaque bytes) — the client already
  // checked the original was a PDF before encrypting it, so only enforce the
  // mime check on the plaintext path.
  if (!isEncrypted && file.type !== "application/pdf") {
    return { error: "Only PDF files are supported" };
  }

  const fileName =
    (isEncrypted ? String(formData.get("originalFileName") ?? "") : "") || file.name;
  const storagePath = `${user.id}/${plotId}/${crypto.randomUUID()}-${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const { error: insertError } = await supabase.from("plot_documents").insert({
    plot_id: plotId,
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

  revalidatePath(`/plots/${plotId}`);
  return { success: true };
}

export async function deleteDocument(plotId: string, documentId: string, storagePath: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  // Belt-and-suspenders on top of RLS: confirm this row is both the document
  // asked for and actually owned by the caller before touching storage.
  const { data: doc } = await supabase
    .from("plot_documents")
    .select("id, user_id, storage_path")
    .eq("id", documentId)
    .eq("plot_id", plotId)
    .single();
  if (!doc || doc.user_id !== user.id || doc.storage_path !== storagePath) {
    throw new Error("Document not found");
  }

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (storageError) throw new Error(storageError.message);

  const { error: dbError } = await supabase.from("plot_documents").delete().eq("id", documentId);
  if (dbError) throw new Error(dbError.message);

  revalidatePath(`/plots/${plotId}`);
}

export async function getDocumentPreviewUrl(storagePath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60);
  if (error) return { error: error.message };
  return { url: data.signedUrl };
}
