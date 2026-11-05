/**
 * A same-site path to send the user to after sign-in. Anything that isn't a
 * plain absolute path ("//evil.com", "/\\evil.com", "@evil.com", ".evil.com",
 * "https://…") falls back to the dashboard, so `${origin}${path}` can't leave
 * the site.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !/^\/(?![/\\])/.test(next) || /[\u0000-\u001f\\]/.test(next)) return fallback;
  return next;
}
