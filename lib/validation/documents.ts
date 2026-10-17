export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
export const GCM_TAG_BYTES = 16;
export const MAX_STORED_DOCUMENT_BYTES = MAX_DOCUMENT_BYTES + GCM_TAG_BYTES;
export const IV_HEX = /^\\x[0-9a-f]{24}$/i;

export function validPdfName(name: unknown): name is string {
  return typeof name === "string" && name.length > 4 && name.length <= 180 &&
    name.trim() === name && !/[\u0000-\u001f\u007f/\\:<>"|?*]/.test(name) &&
    !name.startsWith(".") && /\.pdf$/i.test(name);
}

/** Signature checks reject obvious MIME spoofing; they are not a malware scan. */
export type DocumentError = "onlyPdf" | "choosePdf" | "fileTooLarge" | "invalidPdfContent" | "invalidEncryption";

export async function validatePdf(file: File): Promise<DocumentError | null> {
  if (!validPdfName(file.name) || file.type !== "application/pdf") return "onlyPdf";
  if (file.size === 0) return "choosePdf";
  if (file.size > MAX_DOCUMENT_BYTES) return "fileTooLarge";
  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const prefix = String.fromCharCode(...header);
  if (!/^%PDF-(?:1\.[0-7]|2\.0)/.test(prefix)) return "invalidPdfContent";
  const tail = String.fromCharCode(...new Uint8Array(await file.slice(-1024).arrayBuffer()));
  return /%%EOF[\t\n\r\f ]*$/.test(tail) ? null : "invalidPdfContent";
}

type ValidatedUpload = { error: DocumentError } | {
  file: File; fileName: string; isEncrypted: boolean; iv: string | null; contentType: string;
};
export async function validateDocumentUpload(form: FormData): Promise<ValidatedUpload> {
  if (!(form instanceof FormData)) return { error: "choosePdf" };
  const file = form.get("file");
  if (form.getAll("file").length !== 1 || !(file instanceof File) || file.size === 0) {
    return { error: "choosePdf" } as const;
  }
  const iv = form.get("encryptionIvHex");
  if (form.getAll("encryptionIvHex").length > 1 || form.getAll("originalFileName").length > 1) {
    return { error: "invalidEncryption" } as const;
  }
  const isEncrypted = iv !== null && iv !== "";
  if (!isEncrypted) {
    const error = await validatePdf(file);
    return error ? { error } : { file, fileName: file.name, isEncrypted: false, iv: null, contentType: "application/pdf" };
  }
  if (typeof iv !== "string" || !IV_HEX.test(iv) || file.type !== "application/octet-stream" ||
      file.size <= GCM_TAG_BYTES) return { error: "invalidEncryption" } as const;
  if (file.size > MAX_STORED_DOCUMENT_BYTES) return { error: "fileTooLarge" } as const;
  const name = form.get("originalFileName");
  if (!validPdfName(name)) return { error: "onlyPdf" } as const;
  // Ciphertext is intentionally opaque. Never claim to verify its plaintext type.
  return { file, fileName: name, isEncrypted: true, iv, contentType: "application/octet-stream" };
}
