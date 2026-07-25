import { beforeEach, describe, expect, it, vi } from "vitest";

const createServerClientMock = vi.fn((..._unusedArgs: unknown[]) => ({ fake: "server-client" }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (...a: unknown[]) => createServerClientMock(...a),
}));

const getAllMock = vi.fn((..._unusedArgs: unknown[]) => [{ name: "sb-token", value: "abc" }]);
const setMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: getAllMock, set: setMock }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
});

describe("createClient (server)", () => {
  it("builds a server client wired to the request's cookie store", async () => {
    const { createClient } = await import("./server");
    await createClient();
    expect(createServerClientMock).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "publishable-key",
      expect.objectContaining({ cookies: expect.any(Object) }),
    );
    const { cookies } = createServerClientMock.mock.calls[0][2] as {
      cookies: { getAll: () => unknown; setAll: (v: unknown[]) => void };
    };
    expect(cookies.getAll()).toEqual([{ name: "sb-token", value: "abc" }]);
  });

  it("writes each cookie via the store's set() when setAll is called", async () => {
    const { createClient } = await import("./server");
    await createClient();
    const { cookies } = createServerClientMock.mock.calls[0][2] as {
      cookies: { setAll: (v: unknown[]) => void };
    };
    cookies.setAll([{ name: "a", value: "1", options: { path: "/" } }]);
    expect(setMock).toHaveBeenCalledWith("a", "1", { path: "/" });
  });

  it("swallows the error when setAll is called from a context that can't set cookies (Server Component render)", async () => {
    setMock.mockImplementation(() => {
      throw new Error("cannot set cookies here");
    });
    const { createClient } = await import("./server");
    await createClient();
    const { cookies } = createServerClientMock.mock.calls[0][2] as {
      cookies: { setAll: (v: unknown[]) => void };
    };
    expect(() => cookies.setAll([{ name: "a", value: "1", options: {} }])).not.toThrow();
  });
});
