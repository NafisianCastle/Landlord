import webpush from "web-push";
import { getPushConfiguration } from "@/lib/pushConfig";

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

export async function sendPush(
  sub: PushSubscriptionRow,
  payload: PushPayload,
): Promise<{ endpoint: string; expired: boolean; sent: boolean }> {
  const vapidDetails = getPushConfiguration();
  if (!vapidDetails)
    return { endpoint: sub.endpoint, expired: false, sent: false };
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { vapidDetails },
    );
    return { endpoint: sub.endpoint, expired: false, sent: true };
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    return {
      endpoint: sub.endpoint,
      expired: statusCode === 404 || statusCode === 410,
      sent: false,
    };
  }
}
