import { timingSafeEqual } from "node:crypto";

/**
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Compared in
 * constant time; an unset or blank secret always refuses.
 */
export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
