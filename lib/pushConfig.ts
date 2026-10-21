import { createECDH, timingSafeEqual } from "node:crypto";

/** Server-only configuration. Only pass publicKey to client components. */
export function getPushConfiguration() {
  const publicKey = (
    process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  )?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) return null;

  try {
    const contact = new URL(subject);
    if (!["https:", "mailto:"].includes(contact.protocol)) return null;
    if (
      !/^[A-Za-z0-9_-]+$/.test(publicKey) ||
      !/^[A-Za-z0-9_-]+$/.test(privateKey)
    )
      return null;
    const publicBytes = Buffer.from(publicKey, "base64url");
    const privateBytes = Buffer.from(privateKey, "base64url");
    if (
      publicBytes.length !== 65 ||
      publicBytes[0] !== 4 ||
      privateBytes.length !== 32
    )
      return null;
    const curve = createECDH("prime256v1");
    curve.setPrivateKey(privateBytes);
    if (!timingSafeEqual(curve.getPublicKey(), publicBytes)) return null;
    return { publicKey, privateKey, subject };
  } catch {
    return null;
  }
}

export function getRentReminderPublicKey(): string | null {
  // Both scheduled routes need the cron credential and the privileged DB client.
  if (
    !process.env.CRON_SECRET?.trim() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  )
    return null;
  return getPushConfiguration()?.publicKey ?? null;
}
