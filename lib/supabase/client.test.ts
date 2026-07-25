import { beforeEach, describe, expect, it, vi } from "vitest";

const createBrowserClientMock = vi.fn((..._unusedArgs: unknown[]) => ({ fake: "browser-client" }));
vi.mock("@supabase/ssr", () => ({
  createBrowserClient: (...a: unknown[]) => createBrowserClientMock(...a),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
});

describe("createClient (browser)", () => {
  it("builds a browser client from the public env vars", async () => {
    const { createClient } = await import("./client");
    createClient();
    expect(createBrowserClientMock).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "publishable-key",
    );
  });
});
