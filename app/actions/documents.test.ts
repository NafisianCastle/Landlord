import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePathMock = vi.fn();
const getUserWithAccessMock = vi.fn();

const uploadMock = vi.fn();
const removeMock = vi.fn();
const createSignedUrlMock = vi.fn();
const storageFromMock = vi.fn(() => ({
  upload: uploadMock,
  remove: removeMock,
  createSignedUrl: createSignedUrlMock,
}));

let selectSingleResult: { data?: unknown; error?: unknown } = { data: null, error: null };
let insertResult: { error: unknown } = { error: null };
let deleteResultThen: unknown = undefined;
const getUserMock = vi.fn();

function makeTableChain() {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.single = vi.fn(async () => selectSingleResult);
  chain.insert = vi.fn(async () => insertResult);
  chain.delete = vi.fn(() => chain);
  chain.then = (resolve: (v: unknown) => void) => resolve(deleteResultThen);
  return chain;
}

const fromMock = vi.fn(() => makeTableChain());
const supabaseMock = {
  from: fromMock,
  storage: { from: storageFromMock },
  auth: { getUser: getUserMock },
};
const createClientMock = vi.fn(async () => supabaseMock);

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/access", () => ({ getUserWithAccess: getUserWithAccessMock }));

function fd(fields: Record<string, unknown>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v instanceof File) data.set(k, v);
    else data.set(k, String(v));
  }
  return data;
}

function pdfFile(name = "deed.pdf", size = 1024, type = "application/pdf") {
  return new File([new Uint8Array(size)], name, { type });
}

beforeEach(() => {
  vi.clearAllMocks();
  selectSingleResult = { data: null, error: null };
  insertResult = { error: null };
  deleteResultThen = undefined;
  uploadMock.mockResolvedValue({ error: null });
  removeMock.mockResolvedValue({ error: null });
});

describe("uploadDocument", () => {
  it("returns an error when not signed in", async () => {
    getUserWithAccessMock.mockResolvedValue(null);
    const { uploadDocument } = await import("./documents");
    const result = await uploadDocument("p1", null, fd({ file: pdfFile() }));
    expect(result).toEqual({ error: "Not signed in" });
  });

  it("returns an upgrade-prompt error when access has lapsed", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: false });
    const { uploadDocument } = await import("./documents");
    const result = await uploadDocument("p1", null, fd({ file: pdfFile() }));
    expect(result).toEqual({ error: "Your trial has ended — please upgrade to continue." });
  });

  it("rejects when no file is chosen", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: true });
    const { uploadDocument } = await import("./documents");
    const result = await uploadDocument("p1", null, new FormData());
    expect(result).toEqual({ error: "Choose a PDF file" });
  });

  it("rejects a zero-byte file", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: true });
    const { uploadDocument } = await import("./documents");
    const result = await uploadDocument("p1", null, fd({ file: pdfFile("deed.pdf", 0) }));
    expect(result).toEqual({ error: "Choose a PDF file" });
  });

  it("rejects a file over the 20MB limit", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: true });
    const { uploadDocument } = await import("./documents");
    const result = await uploadDocument(
      "p1",
      null,
      fd({ file: pdfFile("deed.pdf", 20 * 1024 * 1024 + 1) }),
    );
    expect(result).toEqual({ error: "File is too large — max 20 MB." });
  });

  it("accepts a file exactly at the 20MB limit (boundary)", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: true });
    const { uploadDocument } = await import("./documents");
    const result = await uploadDocument(
      "p1",
      null,
      fd({ file: pdfFile("deed.pdf", 20 * 1024 * 1024) }),
    );
    expect(result).toEqual({ success: true });
  });

  it("rejects a non-PDF plaintext upload", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: true });
    const { uploadDocument } = await import("./documents");
    const result = await uploadDocument(
      "p1",
      null,
      fd({ file: pdfFile("deed.png", 100, "image/png") }),
    );
    expect(result).toEqual({ error: "Only PDF files are supported" });
  });

  it("skips the mime check for encrypted uploads (opaque ciphertext)", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: true });
    const { uploadDocument } = await import("./documents");
    const result = await uploadDocument(
      "p1",
      null,
      fd({
        file: pdfFile("deed.bin", 100, "application/octet-stream"),
        encryptionIvHex: "abcd",
        originalFileName: "deed.pdf",
      }),
    );
    expect(result).toEqual({ success: true });
  });

  it("returns the storage error and does not insert a row when upload fails", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: true });
    uploadMock.mockResolvedValue({ error: { message: "storage full" } });
    const { uploadDocument } = await import("./documents");
    const result = await uploadDocument("p1", null, fd({ file: pdfFile() }));
    expect(result).toEqual({ error: "storage full" });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("rolls back the uploaded file when the db insert fails", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: true });
    insertResult = { error: { message: "insert failed" } };
    const { uploadDocument } = await import("./documents");
    const result = await uploadDocument("p1", null, fd({ file: pdfFile() }));
    expect(result).toEqual({ error: "insert failed" });
    expect(removeMock).toHaveBeenCalled();
  });

  it("revalidates the plot page and returns success on a clean upload", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: true });
    const { uploadDocument } = await import("./documents");
    const result = await uploadDocument("p1", null, fd({ file: pdfFile() }));
    expect(revalidatePathMock).toHaveBeenCalledWith("/plots/p1");
    expect(result).toEqual({ success: true });
  });
});

describe("deleteDocument", () => {
  it("no-ops when there is no authenticated user", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { deleteDocument } = await import("./documents");
    await deleteDocument("p1", "d1", "u1/p1/x.pdf");
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("no-ops when the document is not found", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    selectSingleResult = { data: null, error: null };
    const { deleteDocument } = await import("./documents");
    await deleteDocument("p1", "d1", "u1/p1/x.pdf");
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("no-ops when the document belongs to a different user", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    selectSingleResult = {
      data: { id: "d1", user_id: "someone-else", storage_path: "u1/p1/x.pdf" },
    };
    const { deleteDocument } = await import("./documents");
    await deleteDocument("p1", "d1", "u1/p1/x.pdf");
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("no-ops when the storage path does not match (tampered client call)", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    selectSingleResult = {
      data: { id: "d1", user_id: "u1", storage_path: "u1/p1/other.pdf" },
    };
    const { deleteDocument } = await import("./documents");
    await deleteDocument("p1", "d1", "u1/p1/x.pdf");
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("removes storage, deletes the row, and revalidates when everything matches", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    selectSingleResult = {
      data: { id: "d1", user_id: "u1", storage_path: "u1/p1/x.pdf" },
    };
    const { deleteDocument } = await import("./documents");
    await deleteDocument("p1", "d1", "u1/p1/x.pdf");
    expect(removeMock).toHaveBeenCalledWith(["u1/p1/x.pdf"]);
    expect(revalidatePathMock).toHaveBeenCalledWith("/plots/p1");
  });
});

describe("getDocumentPreviewUrl", () => {
  it("returns the error message when signing fails", async () => {
    createSignedUrlMock.mockResolvedValue({ data: null, error: { message: "not found" } });
    const { getDocumentPreviewUrl } = await import("./documents");
    const result = await getDocumentPreviewUrl("u1/p1/x.pdf");
    expect(result).toEqual({ error: "not found" });
  });

  it("returns the signed url on success", async () => {
    createSignedUrlMock.mockResolvedValue({
      data: { signedUrl: "https://signed/x.pdf" },
      error: null,
    });
    const { getDocumentPreviewUrl } = await import("./documents");
    const result = await getDocumentPreviewUrl("u1/p1/x.pdf");
    expect(result).toEqual({ url: "https://signed/x.pdf" });
    expect(createSignedUrlMock).toHaveBeenCalledWith("u1/p1/x.pdf", 60);
  });
});
