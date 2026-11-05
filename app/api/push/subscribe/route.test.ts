import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  config: vi.fn(),
  from: vi.fn(),
  upsert: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.user },
    from: mocks.from,
  }),
}));
vi.mock("@/lib/pushConfig", () => ({ getRentReminderPublicKey: mocks.config }));
import { POST } from "./route";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ data: { user: { id: "u1" } } });
  mocks.config.mockReturnValue("test-public");
  mocks.from.mockReturnValue({ upsert: mocks.upsert });
  mocks.upsert.mockResolvedValue({ error: null });
});
const request = () =>
  new Request("https://example.com/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: "https://push.example/test",
      keys: { p256dh: "test", auth: "test" },
    }),
  });
describe("subscription setup", () => {
  it("requires an authenticated user before checking setup or saving anything", async () => {
    mocks.user.mockResolvedValue({ data: { user: null } });
    expect((await POST(request())).status).toBe(401);
    expect(mocks.config).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("returns 503 and does not persist a subscription while delivery is unconfigured", async () => {
    mocks.config.mockReturnValue(null);
    expect((await POST(request())).status).toBe(503);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("saves the subscription under the verified current user", async () => {
    expect((await POST(request())).status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u1" }),
      { onConflict: "endpoint" },
    );
  });
});
