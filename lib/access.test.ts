import { afterEach, describe, expect, it, vi } from "vitest";
import { getUserWithAccess, hasActiveAccess } from "./access";

const createClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

function mockSupabase({ user = null }: { user?: { id: string } | null }) {
  createClientMock.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user } }) },
  });
}

describe("hasActiveAccess", () => {
  afterEach(() => vi.clearAllMocks());

  it("always returns true (app is free)", async () => {
    expect(await hasActiveAccess("u1")).toBe(true);
  });
});

describe("getUserWithAccess", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns null when there is no session", async () => {
    mockSupabase({ user: null });
    expect(await getUserWithAccess()).toBeNull();
  });

  it("returns the user with hasAccess true when signed in", async () => {
    mockSupabase({ user: { id: "u1" } });
    expect(await getUserWithAccess()).toEqual({ user: { id: "u1" }, hasAccess: true });
  });
});
