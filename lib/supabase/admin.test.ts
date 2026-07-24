import { beforeEach, describe, expect, it, vi } from "vitest";

const createSupabaseClientMock = vi.fn((..._unusedArgs: unknown[]) => ({ fake: "admin-client" }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: (...a: unknown[]) => createSupabaseClientMock(...a),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
});

describe("createAdminClient", () => {
  it("builds a service-role client with auto-refresh and session persistence disabled", async () => {
    const { createAdminClient } = await import("./admin");
    createAdminClient();
    expect(createSupabaseClientMock).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "service-role-key",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  });
});
