import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  create: vi.fn(),
  revoke: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock("@/lib/tenantPortal", () => ({
  createTenantPortalLinkForOwner: mocks.create,
  revokeTenantPortalLinksForOwner: mocks.revoke,
}));

import { DELETE, POST } from "./route";

function request(method: "POST" | "DELETE", body: unknown, token = "good-token") {
  return new Request("https://example.test/api/tenant-links", {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockImplementation(async (token: string) => ({
    data: { user: token === "good-token" ? { id: "owner-id" } : null },
  }));
});

describe("mobile tenant portal link API", () => {
  it("uses the authenticated owner and never accepts an owner from the body", async () => {
    mocks.create.mockResolvedValue({ success: true, url: "https://example.test/tenant/bills/token" });
    const response = await POST(request("POST", { tenantShareId: "share-id", ownerId: "attacker" }));
    expect(response.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledWith("owner-id", "share-id");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("rejects invalid bearer tokens and malformed bodies before creating a link", async () => {
    expect((await POST(request("POST", { tenantShareId: "share-id" }, "bad"))).status).toBe(401);
    expect((await POST(request("POST", { tenantShareId: 4 }))).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("revokes links for the authenticated owner's tenant share", async () => {
    mocks.revoke.mockResolvedValue({ success: true });
    const response = await DELETE(request("DELETE", { tenantShareId: "share-id" }));
    expect(response.status).toBe(200);
    expect(mocks.revoke).toHaveBeenCalledWith("owner-id", "share-id");
  });
});
