import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DocumentRow from "./DocumentRow";

const deleteDocumentMock = vi.fn();

vi.mock("@/app/actions/documents", () => ({
  deleteDocument: (...args: unknown[]) => deleteDocumentMock(...args),
}));
vi.mock("./PdfPreviewModal", () => ({
  default: ({ fileName }: { fileName: string }) => (
    <button type="button">Preview {fileName}</button>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  deleteDocumentMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DocumentRow", () => {
  it("renders the file name and a preview control", () => {
    render(
      <DocumentRow plotId="p1" documentId="d1" storagePath="u1/p1/x.pdf" fileName="deed.pdf" />,
    );
    expect(screen.getByText("deed.pdf")).toBeInTheDocument();
    expect(screen.getByText("Preview deed.pdf")).toBeInTheDocument();
  });

  it("does not delete when the confirm dialog is declined", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <DocumentRow plotId="p1" documentId="d1" storagePath="u1/p1/x.pdf" fileName="deed.pdf" />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(deleteDocumentMock).not.toHaveBeenCalled();
    expect(screen.getByText("deed.pdf")).toBeInTheDocument();
  });

  it("deletes and unmounts the row when confirmed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <DocumentRow plotId="p1" documentId="d1" storagePath="u1/p1/x.pdf" fileName="deed.pdf" />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(deleteDocumentMock).toHaveBeenCalledWith("p1", "d1", "u1/p1/x.pdf");
    await waitFor(() => expect(screen.queryByText("deed.pdf")).not.toBeInTheDocument());
  });

  it("includes the file name in the confirm prompt", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <DocumentRow plotId="p1" documentId="d1" storagePath="u1/p1/x.pdf" fileName="deed.pdf" />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(confirmSpy).toHaveBeenCalledWith('Delete "deed.pdf"? This can\'t be undone.');
  });
});
