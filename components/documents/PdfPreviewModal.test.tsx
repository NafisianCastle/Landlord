import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PdfPreviewModal from "./PdfPreviewModal";

const getDocumentPreviewUrlMock = vi.fn();
const decryptBytesMock = vi.fn();
const getSessionDEKMock = vi.fn();

vi.mock("@/lib/pdfWorker", () => ({}));
vi.mock("@/app/actions/documents", () => ({
  getDocumentPreviewUrl: (...args: unknown[]) => getDocumentPreviewUrlMock(...args),
}));
vi.mock("@/lib/crypto/encryption", () => ({
  decryptBytes: (...args: unknown[]) => decryptBytesMock(...args),
  fromPgBytea: (hex: string) => new Uint8Array(Buffer.from(hex.replace(/^\\x/, ""), "hex")),
}));
vi.mock("@/lib/crypto/session", () => ({
  getSessionDEK: (...args: unknown[]) => getSessionDEKMock(...args),
}));
vi.mock("react-pdf", () => ({
  Document: ({ children, onLoadSuccess }: { children: React.ReactNode; onLoadSuccess: (v: { numPages: number }) => void }) => {
    onLoadSuccess({ numPages: 1 });
    return <div data-testid="pdf-document">{children}</div>;
  },
  Page: ({ pageNumber }: { pageNumber: number }) => (
    <div data-testid="pdf-page">Page {pageNumber}</div>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PdfPreviewModal — plaintext document", () => {
  it("opens the modal, loads the signed url, and renders the PDF document", async () => {
    getDocumentPreviewUrlMock.mockResolvedValue({ url: "https://signed/deed.pdf" });
    render(<PdfPreviewModal storagePath="u1/p1/deed.pdf" fileName="deed.pdf" />);
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(await screen.findByTestId("pdf-document")).toBeInTheDocument();
    expect(screen.getByText("deed.pdf")).toBeInTheDocument();
  });

  it("shows the error message when fetching the signed url fails", async () => {
    getDocumentPreviewUrlMock.mockResolvedValue({ error: "not found" });
    render(<PdfPreviewModal storagePath="u1/p1/deed.pdf" fileName="deed.pdf" />);
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(await screen.findByText("not found")).toBeInTheDocument();
  });

  it("closes and resets state when Close is clicked", async () => {
    getDocumentPreviewUrlMock.mockResolvedValue({ url: "https://signed/deed.pdf" });
    render(<PdfPreviewModal storagePath="u1/p1/deed.pdf" fileName="deed.pdf" />);
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    await screen.findByTestId("pdf-document");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByTestId("pdf-document")).not.toBeInTheDocument();
  });
});

describe("PdfPreviewModal — encrypted document", () => {
  it("shows a lock message when opened without an unlocked session", async () => {
    getSessionDEKMock.mockReturnValue(null);
    render(
      <PdfPreviewModal
        storagePath="u1/p1/deed.pdf"
        fileName="deed.pdf"
        isEncrypted
        encryptionIvHex="\\x0102"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(
      await screen.findByText("Unlock encryption in Profile to preview this document."),
    ).toBeInTheDocument();
    expect(getDocumentPreviewUrlMock).not.toHaveBeenCalled();
  });

  it("fetches, decrypts, and renders the document when the session is unlocked", async () => {
    getSessionDEKMock.mockReturnValue({ fake: "dek" });
    getDocumentPreviewUrlMock.mockResolvedValue({ url: "https://signed/deed.enc" });
    decryptBytesMock.mockResolvedValue(new Uint8Array([1, 2, 3]));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ arrayBuffer: async () => new Uint8Array([9, 9]).buffer }),
    );

    render(
      <PdfPreviewModal
        storagePath="u1/p1/deed.pdf"
        fileName="deed.pdf"
        isEncrypted
        encryptionIvHex="\\x0102"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(await screen.findByTestId("pdf-document")).toBeInTheDocument();
    expect(decryptBytesMock).toHaveBeenCalled();
  });

  it("shows a decrypt error when the current session key can't decrypt the blob", async () => {
    getSessionDEKMock.mockReturnValue({ fake: "wrong-dek" });
    getDocumentPreviewUrlMock.mockResolvedValue({ url: "https://signed/deed.enc" });
    decryptBytesMock.mockRejectedValue(new Error("bad tag"));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ arrayBuffer: async () => new Uint8Array([9, 9]).buffer }),
    );

    render(
      <PdfPreviewModal
        storagePath="u1/p1/deed.pdf"
        fileName="deed.pdf"
        isEncrypted
        encryptionIvHex="\\x0102"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(
      await screen.findByText("Couldn't decrypt with the current session key."),
    ).toBeInTheDocument();
  });

  it("shows the signed-url error when fetching it fails for an encrypted doc", async () => {
    getSessionDEKMock.mockReturnValue({ fake: "dek" });
    getDocumentPreviewUrlMock.mockResolvedValue({ error: "expired" });
    render(
      <PdfPreviewModal
        storagePath="u1/p1/deed.pdf"
        fileName="deed.pdf"
        isEncrypted
        encryptionIvHex="\\x0102"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(await screen.findByText("expired")).toBeInTheDocument();
  });
});
