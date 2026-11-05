import type { ErrorEvent } from "@sentry/nextjs";

/**
 * Keeps property data and credentials out of error reports: drops request
 * bodies, cookies, query strings and auth headers, and anything identifying
 * the user beyond their id. Shared by every Sentry.init.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.query_string;
    if (event.request.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }
  }
  if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
  return event;
}
