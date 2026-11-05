import { generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFcmConfiguration, leasePropertyPath, sendFcm } from "./fcm";

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const account = {
  project_id: "landlord-test",
  client_email: "push@landlord-test.iam.gserviceaccount.com",
  private_key: privateKey,
};
const fetchMock = vi.fn();
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status });

beforeEach(() => {
  vi.stubEnv("FCM_SERVICE_ACCOUNT_JSON", JSON.stringify(account));
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) =>
    url.startsWith("https://oauth2.googleapis.com")
      ? json(200, { access_token: "access", expires_in: 3600 })
      : json(200, { name: "projects/landlord-test/messages/1" }),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("FCM configuration", () => {
  it("reads the service account", () => {
    expect(getFcmConfiguration()?.project_id).toBe("landlord-test");
  });
  it.each(["", "not json", JSON.stringify({ project_id: "x" })])(
    "is disabled for %j",
    (value) => {
      vi.stubEnv("FCM_SERVICE_ACCOUNT_JSON", value);
      expect(getFcmConfiguration()).toBeNull();
    },
  );
});

describe("sendFcm", () => {
  it("sends an HTTP v1 message with a signed-JWT access token", async () => {
    await expect(
      sendFcm("device", { title: "Rent due", body: "Example", url: "/plots/1" }),
    ).resolves.toEqual({ token: "device", sent: true, expired: false });
    const send = fetchMock.mock.calls.find(([url]) => url.includes("messages:send"))!;
    expect(send[0]).toBe(
      "https://fcm.googleapis.com/v1/projects/landlord-test/messages:send",
    );
    expect(send[1].headers.authorization).toBe("Bearer access");
    expect(JSON.parse(send[1].body).message).toMatchObject({
      token: "device",
      notification: { title: "Rent due", body: "Example" },
      data: { url: "/plots/1" },
    });
  });
  it("flags unregistered tokens for pruning", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.startsWith("https://oauth2")
        ? json(200, { access_token: "access", expires_in: 3600 })
        : json(404, { error: { details: [{ errorCode: "UNREGISTERED" }] } }),
    );
    await expect(sendFcm("gone", { title: "t", body: "b" })).resolves.toEqual({
      token: "gone",
      sent: false,
      expired: true,
    });
  });
  it("keeps transient failures retryable", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.startsWith("https://oauth2")
        ? json(200, { access_token: "access", expires_in: 3600 })
        : json(503, {}),
    );
    await expect(sendFcm("device", { title: "t", body: "b" })).resolves.toEqual({
      token: "device",
      sent: false,
      expired: false,
    });
  });
  it("does nothing when not configured", async () => {
    vi.stubEnv("FCM_SERVICE_ACCOUNT_JSON", "");
    await expect(sendFcm("device", { title: "t", body: "b" })).resolves.toEqual({
      token: "device",
      sent: false,
      expired: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("leasePropertyPath", () => {
  it("links to the lease's property", () => {
    expect(leasePropertyPath({ apartment_id: "a1", plot_id: null })).toBe("/apartments/a1");
    expect(leasePropertyPath({ plot_id: "p1" })).toBe("/plots/p1");
    expect(leasePropertyPath(null)).toBe("/leases");
  });
});
