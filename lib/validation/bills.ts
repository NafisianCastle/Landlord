import { validatePdf } from "@/lib/validation/documents";
import { validateForm } from "@/lib/validation/forms";

export const MAX_BILL_BYTES = 10 * 1024 * 1024;
export const BILL_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

export function validateBill(form: FormData) {
  return validateForm(form, {
    title: { required: true, max: 200 },
    tenantShareId: { required: true, kind: "uuid", max: 36 },
    amount: { required: true, kind: "number", min: 0.01, max: 32, pattern: /^\d+(?:\.\d{1,2})?$/ },
    dueDate: { required: true, kind: "date", max: 10 },
    visible: { choices: ["on"] },
  });
}

/** Inspect signatures as well as MIME/extension; never accept active SVG/HTML. */
export async function validateBillFile(form: FormData) {
  const file = form.get("file");
  if (form.getAll("file").length !== 1 || !(file instanceof File) || !file.size) return { error: "chooseFile" } as const;
  if (file.size > MAX_BILL_BYTES) return { error: "fileTooLarge" } as const;
  if (file.name.length > 180 || /[\u0000-\u001f\u007f/\\]/.test(file.name)) return { error: "fileType" } as const;
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  let extension: string | null = null;
  if (file.type === "image/png" && /\.png$/i.test(file.name) && bytes.length >= 8 &&
    [137,80,78,71,13,10,26,10].every((b, i) => bytes[i] === b)) extension = "png";
  if (file.type === "image/jpeg" && /\.jpe?g$/i.test(file.name) &&
    bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) extension = "jpg";
  if (file.type === "image/webp" && /\.webp$/i.test(file.name) && ascii(0,4) === "RIFF" && ascii(8,12) === "WEBP") extension = "webp";
  if (file.type === "application/pdf" && !await validatePdf(file)) extension = "pdf";
  return extension ? { file, extension } : { error: "fileType" } as const;
}
