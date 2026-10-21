import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: vi.fn(),
  overview: vi.fn(),
  users: vi.fn(),
  coupons: vi.fn(),
  createCoupon: vi.fn(),
  toggleCoupon: vi.fn(),
  grant: vi.fn(),
  updateSettings: vi.fn(),
  settings: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({ select: () => ({ eq: () => ({ single: mocks.profile }) }) }),
  }),
}));
vi.mock("@/lib/adminData", () => ({
  getAdminOverview: mocks.overview,
  getAdminUsers: mocks.users,
  getAdminCoupons: mocks.coupons,
}));
vi.mock("@/lib/adminOps", () => ({
  createCouponOp: mocks.createCoupon,
  toggleCouponOp: mocks.toggleCoupon,
  grantLifetimeAccessOp: mocks.grant,
  updateAppSettingsOp: mocks.updateSettings,
}));
vi.mock("@/lib/settings", () => ({ getAppSettings: mocks.settings }));

import { GET as overview } from "./overview/route";
import { GET as users, POST as grant } from "./users/route";
import { POST as createCoupon, PATCH as toggleCoupon } from "./coupons/route";
import { PUT as updateSettings } from "./settings/route";

const req = (path: string, init: RequestInit & { token?: string | null } = {}) => {
  const { token = "good-token", ...rest } = init;
  return new Request(`https://example.test/api/admin/${path}`, {
    ...rest,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), "content-type": "application/json" },
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockImplementation(async (token: string) => ({
    data: { user: token === "good-token" ? { id: "admin-1" } : null },
  }));
  mocks.profile.mockResolvedValue({ data: { is_admin: true } });
  mocks.overview.mockResolvedValue({ totalUsers: 3 });
  mocks.users.mockResolvedValue([]);
});

describe("/api/admin auth", () => {
  it("rejects a missing or invalid token before reading anything", async () => {
    expect((await overview(req("overview", { token: null }))).status).toBe(401);
    expect((await overview(req("overview", { token: "bad" }))).status).toBe(401);
    expect(mocks.overview).not.toHaveBeenCalled();
  });

  it("rejects signed-in users who are not admins", async () => {
    mocks.profile.mockResolvedValue({ data: { is_admin: false } });
    expect((await users(req("users"))).status).toBe(403);
    expect((await grant(req("users", { method: "POST", body: '{"userId":"x"}' }))).status).toBe(403);
    expect(mocks.users).not.toHaveBeenCalled();
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it("serves admins without caching", async () => {
    const res = await overview(req("overview"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(await res.json()).toEqual({ totalUsers: 3 });
  });
});

describe("/api/admin writes reuse the server-action logic", () => {
  it("creates coupons through the shared op with the caller as creator", async () => {
    mocks.createCoupon.mockResolvedValue({ success: true });
    const res = await createCoupon(req("coupons", {
      method: "POST",
      body: JSON.stringify({ code: "eid", discountType: "percent", discountValue: 10 }),
    }));
    expect(res.status).toBe(200);
    const [adminId, form] = mocks.createCoupon.mock.calls[0];
    expect(adminId).toBe("admin-1");
    expect(form.get("code")).toBe("eid");
    expect(form.get("discountValue")).toBe("10");
  });

  it("returns validation errors as 400", async () => {
    mocks.toggleCoupon.mockResolvedValue({ error: "Invalid coupon." });
    const res = await toggleCoupon(req("coupons", { method: "PATCH", body: '{"id":"nope","active":true}' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid coupon." });
  });

  it("rejects non-object or nested JSON bodies", async () => {
    expect((await updateSettings(req("settings", { method: "PUT", body: "[1]" }))).status).toBe(400);
    expect((await updateSettings(req("settings", { method: "PUT", body: '{"trialDays":{"x":1}}' }))).status).toBe(400);
    expect(mocks.updateSettings).not.toHaveBeenCalled();
  });
});
