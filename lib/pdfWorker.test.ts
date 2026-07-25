import { describe, expect, it, vi } from "vitest";

vi.mock("react-pdf", () => ({
  pdfjs: { GlobalWorkerOptions: { workerSrc: "" } },
}));

describe("pdfWorker", () => {
  it("points react-pdf's worker at the self-hosted script", async () => {
    const { pdfjs } = await import("react-pdf");
    await import("./pdfWorker");
    expect(pdfjs.GlobalWorkerOptions.workerSrc).toBe("/pdf.worker.min.mjs");
  });
});
