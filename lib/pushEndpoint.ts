/**
 * Browser push services a subscription may point at. The reminder crons POST
 * to the stored endpoint, so anything else would let a user make the server
 * call arbitrary hosts. Mirrors push_subscriptions_endpoint_check
 * (supabase/migrations/20261105140000_security_hardening.sql).
 */
const PUSH_ENDPOINT =
  /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com|[a-z0-9.-]+\.push\.apple\.com)\//;

export function isAllowedPushEndpoint(endpoint: unknown): endpoint is string {
  return typeof endpoint === "string" && endpoint.length <= 1000 && PUSH_ENDPOINT.test(endpoint);
}

/** A parsed, size-checked browser PushSubscription, or null. */
export function parsePushSubscription(body: unknown): { endpoint: string; p256dh: string; auth: string } | null {
  if (!body || typeof body !== "object") return null;
  const { endpoint, keys } = body as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  const p256dh = keys?.p256dh;
  const auth = keys?.auth;
  if (!isAllowedPushEndpoint(endpoint)) return null;
  if (typeof p256dh !== "string" || !p256dh || p256dh.length > 200) return null;
  if (typeof auth !== "string" || !auth || auth.length > 100) return null;
  return { endpoint, p256dh, auth };
}
