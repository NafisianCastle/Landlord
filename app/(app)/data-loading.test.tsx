import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), user: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: mocks.from, rpc: mocks.rpc }) }));
vi.mock("@/lib/supabase/current-user", () => ({ getCurrentUser: mocks.user }));

import DashboardPage from "./dashboard/page";
import LeasesPage from "./leases/page";
import { loadRentOverview } from "@/components/dashboard/RentOverview";

let queries: string[];
let finishSchedule: (value: { data: null; error: null }) => void;

beforeEach(() => {
  vi.clearAllMocks();
  queries = [];
  mocks.user.mockResolvedValue({ id: "user", user_metadata: { full_name: "User" } });
  mocks.rpc.mockReturnValue(new Promise(resolve => { finishSchedule = resolve; }));
  mocks.from.mockImplementation((table: string) => {
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "lt", "lte", "not", "is", "order", "limit", "single"]) {
      chain[method] = () => chain;
    }
    chain.then = (resolve: (value: unknown) => void) => {
      queries.push(table);
      resolve({ data: table === "plot_stats" ? { plot_count: 1 } : [], count: 0, error: null });
    };
    return chain;
  });
});

describe("loading without payment-schedule waterfalls", () => {
  it("returns the dashboard overview while rent data is still pending", async () => {
    const result = await DashboardPage();
    expect(result).toBeTruthy();
    expect(queries).toContain("plot_stats");
    expect(queries).toContain("expense_stats");
    expect(queries).not.toContain("lease_payments");
    finishSchedule({ data: null, error: null });
    await vi.waitFor(() => expect(queries).toContain("lease_payments"));
  });

  it("runs lease metadata/expenses immediately, but waits before reading generated payments", async () => {
    const pending = LeasesPage();
    await vi.waitFor(() => expect(queries).toContain("leases"));
    expect(queries).toContain("expense_stats");
    expect(queries).not.toContain("lease_payments");
    expect(queries).not.toContain("lease_payment_stats");
    finishSchedule({ data: null, error: null });
    await pending;
    expect(queries).toContain("lease_payments");
    expect(queries).toContain("lease_payment_stats");
  });

  it("keeps the rent summary's payment reads behind schedule generation", async () => {
    const pending = loadRentOverview();
    await vi.waitFor(() => expect(queries).toContain("expense_stats"));
    expect(queries).not.toContain("lease_payments");
    finishSchedule({ data: null, error: null });
    await pending;
    expect(queries).toContain("lease_payments");
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it("does not start account queries for a guest dashboard", async () => {
    mocks.user.mockResolvedValue(null);
    await DashboardPage();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
