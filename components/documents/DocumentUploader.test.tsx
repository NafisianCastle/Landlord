import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DocumentUploader from "./DocumentUploader";

// jsdom's file inputs don't satisfy the `required` constraint when files are
// assigned via userEvent.upload, so a real button click gets silently
// swallowed by native constraint validation before any submit event fires.
// Dispatching `submit` directly bypasses that jsdom-only gap and exercises
// the same React action path a real, validation-passing click would.
function submitForm() {
  fireEvent.submit(document.querySelector("form")!);
}

const uploadDocumentMock = vi.fn();
const getSessionDEKMock = vi.fn();
const encryptBytesMock = vi.fn();

vi.mock("@/app/actions/documents", () => ({
  uploadDocument: (...args: unknown[]) => uploadDocumentMock(...args),
}));
vi.mock("@/lib/crypto/session", () => ({
  getSessionDEK: (...args: unknown[]) => getSessionDEKMock(...args),
}));
vi.mock("@/lib/crypto/encryption", () => ({
  encryptBytes: (...args: unknown[]) => encryptBytesMock(...args),
  toPgBytea: (bytes: Uint8Array) => `\\x${Buffer.from(bytes).toString("hex")}`,
}));

function makePdf(name = "deed.pdf", content = "pdf-bytes") {
  return new File([content], name, { type: "application/pdf" });
}

beforeEach(() => {
  vi.clearAllMocks();
  getSessionDEKMock.mockReturnValue(null);
  uploadDocumentMock.mockResolvedValue(undefined);
});

describe("DocumentUploader — plaintext (no session unlocked)", () => {
  it("submits the raw file through the bound action without encrypting", async () => {
    render(<DocumentUploader plotId="p1" />);
    const fileInput = document.querySelector('input[name="file"]') as HTMLInputElement;
    const file = makePdf();
    await userEvent.upload(fileInput, file);
    submitForm();

    await waitFor(() => expect(uploadDocumentMock).toHaveBeenCalled());
    const [plotIdArg, , formData] = uploadDocumentMock.mock.calls[0];
    expect(plotIdArg).toBe("p1");
    expect((formData as FormData).get("file")).toBeInstanceOf(File);
    expect(encryptBytesMock).not.toHaveBeenCalled();
  });

  it("shows the server action's error message", async () => {
    uploadDocumentMock.mockResolvedValue({ error: "Only PDF files are supported" });
    render(<DocumentUploader plotId="p1" />);
    const fileInput = document.querySelector('input[name="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, makePdf());
    submitForm();
    expect(await screen.findByText("Only PDF files are supported")).toBeInTheDocument();
  });

  it("shows the selected file's size in the pending button label mid-upload", async () => {
    let resolveUpload!: (v: unknown) => void;
    uploadDocumentMock.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );
    render(<DocumentUploader plotId="p1" />);
    const fileInput = document.querySelector('input[name="file"]') as HTMLInputElement;
    // 2 MiB file so the displayed size is a clean, non-zero number.
    await userEvent.upload(fileInput, makePdf("big.pdf", "x".repeat(2 * 1024 * 1024)));
    submitForm();

    expect(await screen.findByText("Uploading 2.0 MB...")).toBeInTheDocument();
    resolveUpload(undefined);
    expect(await screen.findByText("Upload document")).toBeInTheDocument();
  });
});

describe("DocumentUploader — session unlocked (client-side encryption)", () => {
  it("encrypts the file client-side and submits ciphertext plus the iv/original name", async () => {
    getSessionDEKMock.mockReturnValue({ fake: "dek" });
    encryptBytesMock.mockResolvedValue({
      ciphertext: new Uint8Array([1, 2, 3]),
      iv: new Uint8Array([9, 9]),
    });
    render(<DocumentUploader plotId="p1" />);
    const fileInput = document.querySelector('input[name="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, makePdf("secret.pdf"));
    submitForm();

    await waitFor(() => expect(uploadDocumentMock).toHaveBeenCalled());
    expect(encryptBytesMock).toHaveBeenCalled();
    const [, , formData] = uploadDocumentMock.mock.calls[0];
    const fd = formData as FormData;
    expect(fd.get("originalFileName")).toBe("secret.pdf");
    expect(fd.get("encryptionIvHex")).toBe("\\x0909");
    expect(fd.get("file")).toBeInstanceOf(Blob);
  });

  it("does not call the action when submitted with no file selected", async () => {
    getSessionDEKMock.mockReturnValue({ fake: "dek" });
    render(<DocumentUploader plotId="p1" />);
    submitForm();
    await Promise.resolve();
    expect(uploadDocumentMock).not.toHaveBeenCalled();
    expect(encryptBytesMock).not.toHaveBeenCalled();
  });

});
