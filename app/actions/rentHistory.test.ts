import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ access: vi.fn(), create: vi.fn(), rpc: vi.fn(), single: vi.fn(), eq: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/access", () => ({ getUserWithAccess: mocks.access }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.create }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
import { recordRentHistory } from "./rentHistory";
const lease = "10000000-0000-0000-0000-000000000001";
const property = "20000000-0000-0000-0000-000000000001";
const ranges = [{ from: "2023-01", to: "2023-12", amount: "15000" }];
beforeEach(() => {
  vi.clearAllMocks();
  mocks.access.mockResolvedValue({ hasAccess: true, user: { id: "owner" } });
  mocks.single.mockResolvedValue({ data: { start_date: "2022-01-01", end_date: null, frequency: "monthly" }, error: null });
  mocks.rpc.mockResolvedValue({ data: { recorded: 11, skipped: 1 }, error: null });
  const chain = { select: vi.fn().mockReturnThis(), eq: mocks.eq, maybeSingle: mocks.single };
  mocks.eq.mockReturnValue(chain);
  mocks.create.mockResolvedValue({ from: () => chain, rpc: mocks.rpc });
});
describe("recordRentHistory", () => {
  it("requires access before touching data", async () => {
    mocks.access.mockResolvedValue(null);
    expect(await recordRentHistory(lease, "apartment", property, ranges)).toEqual({ error: "accessRequired" });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("requires ownership and the matching property", async () => {
    mocks.single.mockResolvedValue({ data: null, error: null });
    expect((await recordRentHistory(lease, "apartment", property, ranges)).error).toBe("saveFailed");
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(mocks.eq).toHaveBeenCalledWith("apartment_id", property);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects forged ranges and non-monthly leases", async () => {
    expect((await recordRentHistory(lease, "plot", property, [{ ...ranges[0], amount: "NaN" }])).error).toBe("invalidAmount");
    mocks.single.mockResolvedValue({ data: { frequency: "quarterly" } });
    expect((await recordRentHistory(lease, "plot", property, ranges)).error).toBe("monthlyOnly");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("records atomically and refreshes the property and summaries", async () => {
    expect(await recordRentHistory(lease, "apartment", property, ranges)).toEqual({ success: true, recorded: 11, skipped: 1 });
    expect(mocks.rpc).toHaveBeenCalledWith("record_rent_history", { p_lease_id: lease, p_ranges: ranges });
    expect(mocks.revalidate.mock.calls.map(call => call[0])).toEqual([`/apartments/${property}`, "/dashboard", "/leases"]);
  });
  it("does not claim success when the database rejects a batch", async () => {
    mocks.rpc.mockResolvedValue({ error: { message: "private database details" } });
    expect((await recordRentHistory(lease, "plot", property, ranges)).error).toBe("saveFailed");
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
