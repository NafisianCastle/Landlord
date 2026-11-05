import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  exportData: vi.fn(),
  deleteAccount: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock("@/lib/account", () => ({
  exportAccountData: mocks.exportData,
  deleteAccount: mocks.deleteAccount,
}));

import { DELETE, GET } from "./route";

const user = { id: "u1", email: "a@b.co" };
const req = (method: string, token: string | null = "good", body?: unknown) =>
  new Request("https://example.test/api/account", {
    method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockImplementation(async (token: string) => ({ data: { user: token === "good" ? user : null } }));
  mocks.exportData.mockResolvedValue({ tables: {} });
  mocks.deleteAccount.mockResolvedValue({ success: true });
});

describe("/api/account", () => {
  it("rejects missing or invalid tokens", async () => {
    expect((await GET(req("GET", null))).status).toBe(401);
    expect((await DELETE(req("DELETE", "bad", {}))).status).toBe(401);
    expect(mocks.exportData).not.toHaveBeenCalled();
    expect(mocks.deleteAccount).not.toHaveBeenCalled();
  });

  it("exports the token's own user without caching", async () => {
    const res = await GET(req("GET"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.exportData).toHaveBeenCalledWith(user);
  });

  it("passes the confirmation and password through, ignoring non-strings", async () => {
    await DELETE(req("DELETE", "good", { confirmation: "a@b.co", password: 5 }));
    expect(mocks.deleteAccount).toHaveBeenCalledWith(user, "a@b.co", "");
  });

  it("returns 400 with the error code when deletion is refused", async () => {
    mocks.deleteAccount.mockResolvedValue({ error: "passwordIncorrect" });
    const res = await DELETE(req("DELETE", "good", { confirmation: "a@b.co", password: "x" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "passwordIncorrect" });
  });
});
