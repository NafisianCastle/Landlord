import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rows: {} as Record<string, Record<string, unknown>[]>,
  eqCalls: [] as [string, string, string][],
  deletes: [] as [string, string, string][],
  removed: [] as [string, string[]][],
  deleteUser: vi.fn(),
  signIn: vi.fn(),
  isDemo: vi.fn(),
}));
vi.mock("@/lib/demo", () => ({ isDemoAccount: mocks.isDemo }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: async (column: string, value: string) => {
          mocks.eqCalls.push([table, column, value]);
          return { data: mocks.rows[table] ?? [], error: null };
        },
      }),
      delete: () => ({
        eq: async (column: string, value: string) => {
          mocks.deletes.push([table, column, value]);
          return { error: null };
        },
      }),
    }),
    storage: {
      from: (bucket: string) => ({
        remove: async (paths: string[]) => {
          mocks.removed.push([bucket, paths]);
          return { error: null };
        },
      }),
    },
    auth: { admin: { deleteUser: mocks.deleteUser } },
  }),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { signInWithPassword: mocks.signIn } }),
}));

import { deleteAccount, exportAccountData, needsPassword } from "./account";

const user = { id: "u1", email: "Owner@Example.com", app_metadata: { providers: ["email"] } };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rows = {};
  mocks.eqCalls = [];
  mocks.deletes = [];
  mocks.removed = [];
  mocks.deleteUser.mockResolvedValue({ error: null });
  mocks.isDemo.mockResolvedValue(false);
  mocks.signIn.mockResolvedValue({ error: null });
});

describe("exportAccountData", () => {
  it("reads every owned table filtered to this user only", async () => {
    mocks.rows.land_plots = [{ id: "p1", sensitive_encrypted: "\\xdead" }];
    const result = await exportAccountData(user);
    expect(result.tables.land_plots).toEqual([{ id: "p1", sensitive_encrypted: "\\xdead" }]);
    expect(mocks.eqCalls.every(([, , value]) => value === "u1")).toBe(true);
    expect(mocks.eqCalls).toContainEqual(["profiles", "id", "u1"]);
    expect(mocks.eqCalls).toContainEqual(["apartment_bills", "owner_id", "u1"]);
  });
});

describe("needsPassword", () => {
  it("skips the password only for accounts without an email identity", () => {
    expect(needsPassword(user)).toBe(true);
    expect(needsPassword({ app_metadata: { providers: ["google"] } })).toBe(false);
    expect(needsPassword({ app_metadata: {} })).toBe(true);
  });
});

describe("deleteAccount", () => {
  it("refuses when the typed email doesn't match, touching nothing", async () => {
    expect(await deleteAccount(user, "someone@else.com", "pw")).toEqual({ error: "confirmationMismatch" });
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it("never deletes the shared demo account", async () => {
    mocks.isDemo.mockResolvedValue(true);
    expect(await deleteAccount(user, "owner@example.com", "pw")).toEqual({ error: "deleteFailed" });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it("refuses a wrong password", async () => {
    mocks.signIn.mockResolvedValue({ error: { message: "Invalid login" } });
    expect(await deleteAccount(user, "owner@example.com", "wrong")).toEqual({ error: "passwordIncorrect" });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it("removes files and audit logs, then the auth user", async () => {
    mocks.rows.plot_documents = [{ storage_path: "u1/p1/a.pdf" }];
    mocks.rows.apartment_bills = [{ storage_path: "b1/bill/u1/x.pdf" }, { storage_path: null }];
    const result = await deleteAccount(user, " OWNER@example.com ", "pw");
    expect(result).toEqual({ success: true });
    expect(mocks.signIn).toHaveBeenCalledWith({ email: "Owner@Example.com", password: "pw" });
    expect(mocks.removed).toEqual([
      ["land-documents", ["u1/p1/a.pdf"]],
      ["apartment-bills", ["b1/bill/u1/x.pdf"]],
    ]);
    expect(mocks.deletes).toEqual([
      ["plot_audit_log", "owner_user_id", "u1"],
      ["apartment_audit_log", "owner_user_id", "u1"],
    ]);
    expect(mocks.deleteUser).toHaveBeenCalledWith("u1");
  });

  it("lets Google-only accounts confirm with their email alone", async () => {
    const google = { ...user, app_metadata: { providers: ["google"] } };
    expect(await deleteAccount(google, "owner@example.com", "")).toEqual({ success: true });
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("reports a failed auth delete", async () => {
    mocks.deleteUser.mockResolvedValue({ error: { message: "boom" } });
    expect(await deleteAccount(user, "owner@example.com", "pw")).toEqual({ error: "deleteFailed" });
  });
});
