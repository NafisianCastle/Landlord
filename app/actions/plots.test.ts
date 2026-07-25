import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
const revalidatePathMock = vi.fn();
const getUserWithAccessMock = vi.fn();

// `from()` returns a fresh chainable stub per call; each method records how
// it was invoked and resolves with whatever the test configured via
// `queryResult`, so a single mock shape can cover insert/update/delete/select.
let queryResult: { data?: unknown; error?: unknown } = { data: null, error: null };
const rpcMock = vi.fn(async () => queryResult);

function makeChain() {
  const chain: Record<string, unknown> = {};
  const methods = ["insert", "update", "delete", "select", "eq"];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.single = vi.fn(async () => queryResult);
  // Terminal await (e.g. `await supabase.from(...).delete().eq(...)`)
  chain.then = (resolve: (v: unknown) => void) => resolve(queryResult);
  return chain;
}

const fromMock = vi.fn(() => makeChain());
const supabaseMock = { from: fromMock, rpc: rpcMock };
const createClientMock = vi.fn(async () => supabaseMock);

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/access", () => ({ getUserWithAccess: getUserWithAccessMock }));

function fd(fields: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  queryResult = { data: null, error: null };
  redirectMock.mockImplementation((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  });
});

describe("createPlot", () => {
  it("redirects to /login when unauthenticated", async () => {
    getUserWithAccessMock.mockResolvedValue(null);
    const { createPlot } = await import("./plots");
    await expect(createPlot(null, fd({ name: "Plot 1" }))).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects to /paywall when access has lapsed", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: false });
    const { createPlot } = await import("./plots");
    await expect(createPlot(null, fd({ name: "Plot 1" }))).rejects.toThrow("REDIRECT:/paywall");
  });

  it("rejects a blank/whitespace-only name without hitting the database", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: true });
    const { createPlot } = await import("./plots");
    const result = await createPlot(null, fd({ name: "   " }));
    expect(result).toEqual({ error: "Plot name is required" });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("returns the db error message on insert failure", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: true });
    queryResult = { data: null, error: { message: "duplicate" } };
    const { createPlot } = await import("./plots");
    const result = await createPlot(null, fd({ name: "Plot 1" }));
    expect(result).toEqual({ error: "duplicate" });
  });

  it("redirects to the new plot page on success", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: true });
    queryResult = { data: { id: "p123" }, error: null };
    const { createPlot } = await import("./plots");
    await expect(createPlot(null, fd({ name: "Plot 1" }))).rejects.toThrow(
      "REDIRECT:/plots/p123",
    );
  });

  it("writes plaintext sensitive fields when no encrypted blob is present", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: true });
    queryResult = { data: { id: "p1" }, error: null };
    const { createPlot } = await import("./plots");
    const chain = makeChain();
    fromMock.mockReturnValueOnce(chain);
    await expect(
      createPlot(
        null,
        fd({
          name: "Plot 1",
          village: "Some Village",
          purchasePrice: "100000",
        }),
      ),
    ).rejects.toThrow();
    const insertArg = (chain.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(insertArg.village).toBe("Some Village");
    expect(insertArg.purchase_price).toBe(100000);
    expect(insertArg.sensitive_encrypted).toBeNull();
  });

  it("writes only the encrypted blob and nulls plaintext fields when encrypted data is present", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: true });
    queryResult = { data: { id: "p1" }, error: null };
    const { createPlot } = await import("./plots");
    const chain = makeChain();
    fromMock.mockReturnValueOnce(chain);
    await expect(
      createPlot(
        null,
        fd({
          name: "Plot 1",
          village: "Should be ignored",
          sensitiveEncryptedHex: "abcd",
          sensitiveIvHex: "1234",
        }),
      ),
    ).rejects.toThrow();
    const insertArg = (chain.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(insertArg.sensitive_encrypted).toBe("abcd");
    expect(insertArg.sensitive_iv).toBe("1234");
    expect(insertArg.village).toBeNull();
  });

  it("parses dolil/actual area fields as numbers, null when absent", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: true });
    queryResult = { data: { id: "p1" }, error: null };
    const { createPlot } = await import("./plots");
    const chain = makeChain();
    fromMock.mockReturnValueOnce(chain);
    await expect(
      createPlot(
        null,
        fd({ name: "Plot 1", dolilArea: "5.5", dolilAreaUnit: "decimal" }),
      ),
    ).rejects.toThrow();
    const insertArg = (chain.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(insertArg.dolil_area).toBe(5.5);
    expect(insertArg.dolil_area_unit).toBe("decimal");
    expect(insertArg.actual_area).toBeNull();
    expect(insertArg.actual_area_unit).toBeNull();
  });
});

describe("updatePlotMetadata", () => {
  it("redirects to /login when unauthenticated", async () => {
    getUserWithAccessMock.mockResolvedValue(null);
    const { updatePlotMetadata } = await import("./plots");
    await expect(updatePlotMetadata("p1", null, fd({ name: "X" }))).rejects.toThrow(
      "REDIRECT:/login",
    );
  });

  it("returns an upgrade-prompt error (no redirect) when access has lapsed", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: false });
    const { updatePlotMetadata } = await import("./plots");
    const result = await updatePlotMetadata("p1", null, fd({ name: "X" }));
    expect(result).toEqual({ error: "Your trial has ended — please upgrade to continue." });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("returns the db error message on update failure", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: true });
    queryResult = { error: { message: "row not found" } };
    const { updatePlotMetadata } = await import("./plots");
    const result = await updatePlotMetadata("p1", null, fd({ name: "X" }));
    expect(result).toEqual({ error: "row not found" });
  });

  it("revalidates the plot page and returns success", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: true });
    queryResult = { error: null };
    const { updatePlotMetadata } = await import("./plots");
    const result = await updatePlotMetadata("p1", null, fd({ name: "X" }));
    expect(revalidatePathMock).toHaveBeenCalledWith("/plots/p1");
    expect(result).toEqual({ success: true });
  });
});

describe("deletePlot", () => {
  it("redirects to /login when unauthenticated", async () => {
    getUserWithAccessMock.mockResolvedValue(null);
    const { deletePlot } = await import("./plots");
    await expect(deletePlot("p1")).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects to /paywall when access has lapsed", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: false });
    const { deletePlot } = await import("./plots");
    await expect(deletePlot("p1")).rejects.toThrow("REDIRECT:/paywall");
  });

  it("deletes then redirects to /plots on success", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: true });
    const { deletePlot } = await import("./plots");
    await expect(deletePlot("p1")).rejects.toThrow("REDIRECT:/plots");
  });
});

describe("savePlotBoundary", () => {
  const validPoints = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 1 },
    { lat: 1, lng: 1 },
  ];

  it("redirects to /login when unauthenticated", async () => {
    getUserWithAccessMock.mockResolvedValue(null);
    const { savePlotBoundary } = await import("./plots");
    await expect(savePlotBoundary("p1", validPoints)).rejects.toThrow("REDIRECT:/login");
  });

  it("returns an upgrade-prompt error when access has lapsed", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: false });
    const { savePlotBoundary } = await import("./plots");
    const result = await savePlotBoundary("p1", validPoints);
    expect(result).toEqual({ error: "Your trial has ended — please upgrade to continue." });
  });

  it("rejects fewer than 3 points before touching the database", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: true });
    const { savePlotBoundary } = await import("./plots");
    const result = await savePlotBoundary("p1", [{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }]);
    expect(result).toEqual({ error: "Need at least 3 points to form a boundary" });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("returns the rpc error message on failure", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: true });
    queryResult = { error: { message: "rpc failed" } };
    const { savePlotBoundary } = await import("./plots");
    const result = await savePlotBoundary("p1", validPoints);
    expect(result).toEqual({ error: "rpc failed" });
  });

  it("calls the rpc with a closed polygon and revalidates both paths on success", async () => {
    getUserWithAccessMock.mockResolvedValue({ user: { id: "u1" }, hasAccess: true });
    queryResult = { error: null };
    const { savePlotBoundary } = await import("./plots");
    const result = await savePlotBoundary("p1", validPoints);
    expect(rpcMock).toHaveBeenCalledWith("upsert_plot_boundary", {
      p_plot_id: "p1",
      p_geojson: expect.objectContaining({ type: "Polygon" }),
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/plots/p1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/plots");
    expect(result).toEqual({ success: true });
  });
});
