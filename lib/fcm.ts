import { createSign } from "node:crypto";

// Firebase Cloud Messaging (HTTP v1) for the Flutter app's native push.
// Configured with one server-only env var holding the Firebase service
// account key JSON. Without it, native push is simply skipped.

export interface FcmPayload {
  title: string;
  body: string;
  url?: string;
}

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

export function getFcmConfiguration(): ServiceAccount | null {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    const { project_id, client_email, private_key } = JSON.parse(raw);
    if (
      typeof project_id !== "string" ||
      typeof client_email !== "string" ||
      typeof private_key !== "string" ||
      !/^[a-z0-9-]+$/.test(project_id)
    )
      return null;
    return { project_id, client_email, private_key };
  } catch {
    return null;
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null;

/** OAuth2 access token via the service-account JWT bearer flow. */
async function getAccessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.value;

  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(account.private_key, "base64url");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!res.ok) throw new Error(`FCM auth failed: ${res.status}`);
  const { access_token, expires_in } = await res.json();
  cachedToken = { value: access_token, expiresAt: now + Number(expires_in) };
  return access_token;
}

/** Same result contract as sendPush: only report sent after FCM accepts it. */
export async function sendFcm(
  token: string,
  payload: FcmPayload,
): Promise<{ token: string; expired: boolean; sent: boolean }> {
  const account = getFcmConfiguration();
  if (!account) return { token, expired: false, sent: false };
  try {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${await getAccessToken(account)}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: payload.title, body: payload.body },
            data: payload.url ? { url: payload.url } : undefined,
            android: { priority: "high" },
          },
        }),
      },
    );
    if (res.ok) return { token, expired: false, sent: true };
    const error = await res.json().catch(() => null);
    // The app was uninstalled or the token rotated.
    const expired =
      res.status === 404 ||
      JSON.stringify(error?.error?.details ?? []).includes("UNREGISTERED");
    return { token, expired, sent: false };
  } catch {
    return { token, expired: false, sent: false };
  }
}

/** The mobile app has no all-leases screen, so link to the lease's property. */
export function leasePropertyPath(
  lease: { plot_id?: string | null; apartment_id?: string | null } | null | undefined,
): string {
  if (lease?.apartment_id) return `/apartments/${lease.apartment_id}`;
  if (lease?.plot_id) return `/plots/${lease.plot_id}`;
  return "/leases";
}
