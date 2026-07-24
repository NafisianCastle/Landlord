import { afterEach, describe, expect, it, vi } from "vitest";
import { getUserWithAccess, hasActiveAccess } from "./access";

const createClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

function mockSupabase({
  profile = null,
  subscription = null,
  user = null,
}: {
  profile?: { trial_ends_at: string } | null;
  subscription?: { status: string } | null;
  user?: { id: string } | null;
}) {
  const from = vi.fn((table: string) => {
    if (table === "profiles") {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: profile }),
          }),
        }),
      };
    }
    return {
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: subscription }),
          }),
        }),
      }),
    };
  });
  createClientMock.mockResolvedValue({
    from,
    auth: { getUser: async () => ({ data: { user } }) },
  });
}

describe("hasActiveAccess", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns true when a completed subscription exists", async () => {
    mockSupabase({ subscription: { status: "completed" } });
    expect(await hasActiveAccess("u1")).toBe(true);
  });

  it("returns true when the trial has not ended", async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    mockSupabase({ profile: { trial_ends_at: future } });
    expect(await hasActiveAccess("u1")).toBe(true);
  });

  it("returns false when the trial has ended and no subscription", async () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    mockSupabase({ profile: { trial_ends_at: past } });
    expect(await hasActiveAccess("u1")).toBe(false);
  });

  it("returns false when there is neither a profile nor a subscription", async () => {
    mockSupabase({});
    expect(await hasActiveAccess("u1")).toBe(false);
  });

  it("treats trial_ends_at exactly now as expired (strict >)", async () => {
    const now = new Date().toISOString();
    mockSupabase({ profile: { trial_ends_at: now } });
    // Using the literal same timestamp, `new Date(now) > new Date()` is false
    // by the time this runs (a few ms later), matching real strict semantics.
    expect(await hasActiveAccess("u1")).toBe(false);
  });
});

describe("getUserWithAccess", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns null when there is no session", async () => {
    mockSupabase({ user: null });
    expect(await getUserWithAccess()).toBeNull();
  });

  it("returns the user with hasAccess true when access is active", async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    mockSupabase({ user: { id: "u1" }, profile: { trial_ends_at: future } });
    expect(await getUserWithAccess()).toEqual({ user: { id: "u1" }, hasAccess: true });
  });

  it("returns the user with hasAccess false when trial expired and no subscription", async () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    mockSupabase({ user: { id: "u1" }, profile: { trial_ends_at: past } });
    expect(await getUserWithAccess()).toEqual({ user: { id: "u1" }, hasAccess: false });
  });
});
