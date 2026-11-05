import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  inserted: [] as unknown[],
  updated: [] as unknown[],
  access: vi.fn(),
}));

function chain() {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq"]) c[m] = vi.fn(() => c);
  c.insert = vi.fn((value: unknown) => {
    mocks.inserted.push(value);
    return c;
  });
  c.update = vi.fn((value: unknown) => {
    mocks.updated.push(value);
    return c;
  });
  c.single = vi.fn(async () => ({ data: { id: "lease-1" }, error: null }));
  c.then = (resolve: (v: unknown) => void) => resolve({ error: null });
  return c;
}

vi.mock("@/lib/access", () => ({ getUserWithAccess: mocks.access }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: () => chain(), rpc: async () => ({ error: null }) }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { createLease, updateLease } from "./leases";

const property = "00000000-0000-4000-8000-000000000001";
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};
const encrypted = { sensitiveEncryptedHex: `\\x${"ab".repeat(40)}`, sensitiveIvHex: `\\x${"cd".repeat(12)}` };

beforeEach(() => {
  mocks.inserted = [];
  mocks.updated = [];
  mocks.access.mockResolvedValue({ user: { id: "u1" }, hasAccess: true });
});

describe("lease tenant encryption", () => {
  it("stores encrypted tenant details with every plaintext tenant column cleared", async () => {
    const result = await createLease("apartment", property, null, form({
      ...encrypted,
      tenantName: "leaked?",
      rentAmount: "15000",
      startDate: "2026-01-01",
    }));
    expect(result).toEqual({ success: true });
    expect(mocks.inserted[0]).toMatchObject({
      sensitive_encrypted: encrypted.sensitiveEncryptedHex,
      sensitive_iv: encrypted.sensitiveIvHex,
      tenant_name: null,
      tenant_phone: null,
      tenant_email: null,
      notes: null,
      rent_amount: 15000,
    });
  });

  it("clears an old ciphertext when a lease is saved in plaintext", async () => {
    await updateLease("lease-1", "plot", property, null, form({
      tenantName: "Karim",
      rentAmount: "100",
      startDate: "2026-01-01",
    }));
    expect(mocks.updated[0]).toMatchObject({ tenant_name: "Karim", sensitive_encrypted: null, sensitive_iv: null });
  });

  it("still requires a tenant name and apartment email in plaintext", async () => {
    const base = { rentAmount: "100", startDate: "2026-01-01" };
    expect((await createLease("plot", property, null, form(base))).error).toBeTruthy();
    expect((await createLease("apartment", property, null, form({ ...base, tenantName: "A" }))).error).toBeTruthy();
    expect(mocks.inserted).toEqual([]);
  });

  it("rejects malformed ciphertext", async () => {
    const result = await createLease("plot", property, null, form({
      sensitiveEncryptedHex: "not-hex",
      sensitiveIvHex: encrypted.sensitiveIvHex,
      rentAmount: "100",
      startDate: "2026-01-01",
    }));
    expect(result.error).toBe("Invalid encrypted lease data.");
    expect(mocks.inserted).toEqual([]);
  });
});
