import webpush from "web-push";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

// Returns the subscription's endpoint if the push failed because the
// subscription is gone (410/404), so the caller can prune it — anything else
// is left alone and just logged.
export async function sendPush(
  sub: PushSubscriptionRow,
  payload: PushPayload,
): Promise<{ endpoint: string; expired: boolean }> {
  ensureConfigured();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
    return { endpoint: sub.endpoint, expired: false };
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    return { endpoint: sub.endpoint, expired: statusCode === 404 || statusCode === 410 };
  }
}
