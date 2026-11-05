import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), isDemo: vi.fn() }));
vi.mock("@/lib/demo", () => ({ DEMO_READ_ONLY: "read-only demo", isDemoAccount: mocks.isDemo }));
vi.mock("@/lib/site", () => ({ SITE_URL: "https://example.test" }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mocks.from }),
}));

import { createTenantPortalLinkForOwner } from "./tenantPortal";

const ownerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const shareId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isDemo.mockResolvedValue(false);
});

describe("tenant portal links from the demo", () => {
  it("are refused before anything is written", async () => {
    mocks.isDemo.mockResolvedValue(true);
    expect(await createTenantPortalLinkForOwner(ownerId, shareId)).toEqual({ error: "read-only demo" });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

describe("tenant portal link creation", () => {
  it("stores only a hash, then revokes older links after the new link exists", async () => {
    const events: string[] = [];
    let inserted: Record<string, string> | undefined;
    mocks.from.mockImplementation((table: string) => {
      if (table === "apartment_tenants") {
        const chain = {
          select: () => chain,
          eq: () => chain,
          maybeSingle: async () => ({ data: { id: shareId }, error: null }),
        };
        return chain;
      }
      const links = {
        insert: (value: Record<string, string>) => {
          events.push("insert");
          inserted = value;
          return { select: () => ({ single: async () => ({ data: { id: "new-link" }, error: null }) }) };
        },
        update: () => {
          events.push("revoke-old");
          const chain = {
            eq: () => chain,
            is: () => chain,
            neq: async () => ({ error: null }),
          };
          return chain;
        },
      };
      return links;
    });

    const result = await createTenantPortalLinkForOwner(ownerId, shareId);
    expect(result).toMatchObject({ success: true });
    expect(events).toEqual(["insert", "revoke-old"]);
    expect(inserted?.token_hash).toMatch(/^[0-9a-f]{64}$/);
    const rawToken = result.url?.split("/").at(-1);
    expect(rawToken).toMatch(/^[0-9a-f]{64}$/);
    expect(inserted?.token_hash).not.toBe(rawToken);
  });

  it("rejects malformed identifiers before querying the database", async () => {
    expect(await createTenantPortalLinkForOwner("bad", shareId)).toEqual({ error: "Invalid tenant." });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
