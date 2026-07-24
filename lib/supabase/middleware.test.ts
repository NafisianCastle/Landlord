import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getUserMock = vi.fn();
const createServerClientMock = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...a: unknown[]) => createServerClientMock(...a),
}));

beforeEach(() => {
  vi.clearAllMocks();
  createServerClientMock.mockImplementation((_url, _key, { cookies }) => ({
    auth: { getUser: getUserMock },
    _cookies: cookies,
  }));
});

function makeRequest(pathname: string) {
  return new NextRequest(new URL(pathname, "https://example.com"));
}

describe("updateSession", () => {
  it("redirects to /login when there is no session and the path is private", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { updateSession } = await import("./middleware");
    const res = await updateSession(makeRequest("/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://example.com/login");
  });

  it("does not redirect an unauthenticated request to a public path", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { updateSession } = await import("./middleware");
    for (const path of ["/login", "/signup", "/auth/callback", "/api/payments"]) {
      const res = await updateSession(makeRequest(path));
      expect(res.status).not.toBe(307);
    }
  });

  it("treats nested public paths (e.g. /auth/callback/x) as public too", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { updateSession } = await import("./middleware");
    const res = await updateSession(makeRequest("/auth/callback/extra"));
    expect(res.status).not.toBe(307);
  });

  it("does not redirect an authenticated request to a private path", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    const { updateSession } = await import("./middleware");
    const res = await updateSession(makeRequest("/dashboard"));
    expect(res.status).not.toBe(307);
  });

  it("does not treat a path merely prefixed by a public path as public (e.g. /loginx)", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { updateSession } = await import("./middleware");
    const res = await updateSession(makeRequest("/loginx"));
    expect(res.status).toBe(307);
  });

  it("mirrors refreshed auth cookies from the request onto a fresh response", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    const request = makeRequest("/dashboard");
    createServerClientMock.mockImplementation((_url, _key, { cookies }) => ({
      auth: {
        getUser: async () => {
          // Simulate @supabase/ssr refreshing the session mid-request, which
          // triggers this cookie callback before getUser() resolves.
          cookies.setAll([{ name: "sb-token", value: "refreshed", options: { path: "/" } }]);
          return { data: { user: { id: "u1" } } };
        },
      },
    }));
    const { updateSession } = await import("./middleware");
    const res = await updateSession(request);
    expect(request.cookies.get("sb-token")?.value).toBe("refreshed");
    expect(res.cookies.get("sb-token")?.value).toBe("refreshed");
  });
});
