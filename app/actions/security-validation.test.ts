import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(), rpc: vi.fn(), upload: vi.fn(),
  access: vi.fn(async () => ({ user: { id: "user" }, hasAccess: true })),
}));
vi.mock("@/lib/access", () => ({ getUserWithAccess: mocks.access }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mocks.from, rpc: mocks.rpc, storage: { from: () => ({ upload: mocks.upload }) } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { createPlot, savePlotBoundary, migrateGuestPlots } from "./plots";
import { createApartment } from "./apartments";
import { createExpense } from "./expenses";
import { createLease } from "./leases";
import { createVendor } from "./vendors";
import { createMaintenanceRequest, updateMaintenanceStatus } from "./maintenance";
import { uploadDocument } from "./documents";
import { uploadApartmentDocument } from "./apartmentDocuments";

const propertyId = "11111111-1111-4111-8111-111111111111";
function form(fields: Record<string, string | File>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}
beforeEach(() => vi.clearAllMocks());

describe("Server Actions reject invalid submissions before writes", () => {
  const cases: [string, () => Promise<unknown>][] = [
    ["plot amount", () => createPlot(null, form({ name: "plot", purchasePrice: "Infinity" }))],
    ["apartment size", () => createApartment(null, form({ name: "flat", size: "-1" }))],
    ["expense category", () => createExpense("plot", propertyId, null, form({ amount: "50", category: "forged" }))],
    ["lease dates", () => createLease("plot", propertyId, null, form({ tenantName: "Tenant", rentAmount: "50", startDate: "2026-05-01", endDate: "2026-04-01" }))],
    ["vendor field", () => createVendor(null, form({ name: new File(["data"], "x") }))],
    ["maintenance cost", () => createMaintenanceRequest("plot", propertyId, null, form({ title: "Fix", cost: "NaN" }))],
    ["maintenance status", () => updateMaintenanceStatus(propertyId, "plot", propertyId, "forged" as "open")],
    ["boundary coordinates", () => savePlotBoundary(propertyId, [{ lat: Infinity, lng: 90 }, { lat: 23, lng: 90 }, { lat: 24, lng: 91 }])],
    ["import batch", () => migrateGuestPlots(Array(101).fill({ name: "plot" }))],
  ];
  it.each(cases)("rejects invalid %s", async (_label, run) => {
    expect(await run()).toHaveProperty("error");
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it.each([uploadDocument, uploadApartmentDocument])("rejects MIME-spoofed attachments in both upload actions", async action => {
    const result = await action(propertyId, null, form({ file: new File(["<html>malicious</html>"], "deed.pdf", { type: "application/pdf" }) }));
    expect(result).toHaveProperty("error");
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it.each([uploadDocument, uploadApartmentDocument])("rejects malformed property IDs before uploading", async action => {
    expect(await action("../other-property", null, form({}))).toHaveProperty("error");
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
