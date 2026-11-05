import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claimed: [] as { id: string }[],
  upserts: [] as unknown[],
  validate: vi.fn(),
  redeem: vi.fn(),
}));

vi.mock("@/lib/sslcommerz", () => ({ validateSslcommerzPayment: mocks.validate }));
vi.mock("@/lib/coupons", () => ({ recordCouponRedemption: mocks.redeem }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.single = async () =>
        table === "payment_transactions"
          ? { data: { user_id: "u1", amount: 500, status: "pending", coupon_code: "SAVE" } }
          : { data: { id: "coupon-1" } };
      chain.update = () => ({
        eq: () => ({ eq: () => ({ select: async () => ({ data: mocks.claimed, error: null }) }) }),
      });
      chain.upsert = async (value: unknown) => {
        mocks.upserts.push(value);
        return { error: null };
      };
      return chain;
    },
  }),
}));

import { POST } from "./route";

const ipn = () => {
  const body = new FormData();
  body.set("val_id", "val-1");
  body.set("tran_id", "tran-1");
  return new Request("https://x.test/api/payments/sslcommerz/ipn", { method: "POST", body });
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.upserts = [];
  mocks.validate.mockResolvedValue({ status: "VALID", amount: "500", tran_id: "tran-1" });
});

describe("SSLCommerz IPN", () => {
  it("grants access and redeems the coupon when it claims the pending payment", async () => {
    mocks.claimed = [{ id: "row-1" }];
    expect((await POST(ipn())).status).toBe(200);
    expect(mocks.upserts).toHaveLength(1);
    expect(mocks.redeem).toHaveBeenCalledWith("coupon-1", "u1", "tran-1");
  });

  it("does nothing more when a concurrent IPN already claimed it", async () => {
    mocks.claimed = [];
    expect((await POST(ipn())).status).toBe(200);
    expect(mocks.upserts).toHaveLength(0);
    expect(mocks.redeem).not.toHaveBeenCalled();
  });
});
