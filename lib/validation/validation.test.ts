import { describe, expect, it } from "vitest";
import { money, validDate, validateForm, validateLease, validateProperty, vendorRules } from "./forms";
import { validateGuestProperties } from "./guests";
import { validBoundaryPoints } from "./geometry";
import { MAX_DOCUMENT_BYTES, validateDocumentUpload, validatePdf } from "./documents";

function form(fields: Record<string, string | File> = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}
function pdf(size = 100) {
  const bytes = new Uint8Array(size);
  bytes.set(new TextEncoder().encode("%PDF-1.7"));
  bytes.set(new TextEncoder().encode("%%EOF"), size - 5);
  return new File([bytes], "দলিল.pdf", { type: "application/pdf" });
}

describe("untrusted user input", () => {
  it.each(["NaN", "Infinity", "-1", "1e999", "0xff", "1000000000001", "12abc"])("rejects invalid amounts: %s", value => {
    expect(validateForm(form({ amount: value }), { amount: money })).toBeTruthy();
  });
  it("accepts legitimate Unicode, punctuation, multiline notes and decimal amounts", () => {
    expect(validateProperty(form({ name: "ঢাকার জমি — O'Neil", notes: "line one\nline two", purchasePrice: "123.45", actualAreaUnit: "sqmeter" }))).toBeNull();
  });
  it("rejects excessive text, including whitespace-only fields", () => {
    expect(validateProperty(form({ name: "x".repeat(201) }))).toBeTruthy();
    expect(validateForm(form({ notes: " ".repeat(10001) }), vendorRules)).toBeTruthy();
  });
  it("rejects a File in a text field and duplicate values", () => {
    expect(validateProperty(form({ name: pdf() }))).toBeTruthy();
    const fd = form({ name: "valid" }); fd.append("name", "second");
    expect(validateProperty(fd)).toBeTruthy();
  });
  it.each(["2026-02-30", "2026-13-01", "2026-01-99", "not-date", "2026-2-01"])("rejects impossible dates without throwing: %s", value => {
    expect(validDate(value)).toBe(false);
  });
  it("accepts leap day only in a leap year", () => {
    expect(validDate("2024-02-29")).toBe(true);
    expect(validDate("2025-02-29")).toBe(false);
  });
  it("rejects forged enums and reversed lease dates", () => {
    expect(validateLease(form({ frequency: "daily" }))).toBeTruthy();
    expect(validateLease(form({ startDate: "2026-02-01", endDate: "2026-01-01" }))).toBeTruthy();
  });
  it("validates both halves of encrypted metadata", () => {
    expect(validateProperty(form({ name: "plot", sensitiveIvHex: "bad" }))).toBeTruthy();
    expect(validateProperty(form({ name: "plot", sensitiveEncryptedHex: "\\x" + "ab".repeat(16), sensitiveIvHex: "\\x" + "ab".repeat(12) }))).toBeNull();
  });
  it("bounds imported batches and validates every row before writes", () => {
    expect(validateGuestProperties(null)).toBeTruthy();
    expect(validateGuestProperties(Array(101).fill({ name: "plot" }))).toBeTruthy();
    expect(validateGuestProperties([{ name: "valid" }, { name: "bad", purchasePrice: Infinity }])).toBeTruthy();
    expect(validateGuestProperties([{ name: "valid" }])).toBeNull();
  });
  it("rejects oversized, non-numeric, or out-of-range coordinates", () => {
    expect(validBoundaryPoints(Array(2001).fill({ lat: 23, lng: 90 }))).toBe(false);
    expect(validBoundaryPoints([{ lat: NaN, lng: 90 }, { lat: 23, lng: 90 }, { lat: 24, lng: 90 }])).toBe(false);
    expect(validBoundaryPoints([{ lat: 91, lng: 90 }, { lat: 23, lng: 90 }, { lat: 24, lng: 90 }])).toBe(false);
  });
});

describe("attachment validation", () => {
  it("accepts a PDF with a safe Unicode filename", async () => {
    expect(await validatePdf(pdf())).toBeNull();
  });
  it("rejects HTML masquerading as a PDF and missing EOF markers", async () => {
    expect(await validatePdf(new File(["<script>evil()</script>"], "fake.pdf", { type: "application/pdf" }))).toBe("invalidPdfContent");
    expect(await validatePdf(new File(["%PDF-1.7\nno trailer"], "truncated.pdf", { type: "application/pdf" }))).toBe("invalidPdfContent");
  });
  it.each(["../deed.pdf", "evil.php", "deed.pdf.exe", "hidden\u0000.pdf", "x:y.pdf", "x\\y.pdf", ".hidden.pdf"])("rejects unsafe filename %s", async name => {
    const file = new File([await pdf().arrayBuffer()], name, { type: "application/pdf" });
    expect(await validatePdf(file)).toBe("onlyPdf");
  });
  it("enforces empty, exact maximum, and maximum+1 boundaries", async () => {
    expect(await validatePdf(new File([], "empty.pdf", { type: "application/pdf" }))).toBe("choosePdf");
    expect(await validatePdf(pdf(MAX_DOCUMENT_BYTES))).toBeNull();
    expect(await validatePdf(pdf(MAX_DOCUMENT_BYTES + 1))).toBe("fileTooLarge");
  });
  it("does not let a malformed IV bypass plaintext checks", async () => {
    expect(await validateDocumentUpload(form({ file: pdf(), encryptionIvHex: "bad", originalFileName: "deed.pdf" }))).toHaveProperty("error", "invalidEncryption");
  });
  it("allows the GCM tag overhead, enforces ciphertext MIME, and requires a full IV", async () => {
    const data = { encryptionIvHex: "\\x" + "ab".repeat(12), originalFileName: "deed.pdf" };
    const ciphertext = (size: number) => new File([new Uint8Array(size)], "blob", { type: "application/octet-stream" });
    expect(await validateDocumentUpload(form({ ...data, file: ciphertext(MAX_DOCUMENT_BYTES + 16) }))).not.toHaveProperty("error");
    expect(await validateDocumentUpload(form({ ...data, file: ciphertext(MAX_DOCUMENT_BYTES + 17) }))).toHaveProperty("error", "fileTooLarge");
    expect(await validateDocumentUpload(form({ ...data, file: ciphertext(16) }))).toHaveProperty("error", "invalidEncryption");
    expect(await validateDocumentUpload(form({ ...data, file: pdf() }))).toHaveProperty("error", "invalidEncryption");
  });
});
