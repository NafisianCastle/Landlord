import type * as Sentry from "@sentry/nextjs";
import type { ErrorEvent } from "@sentry/nextjs";

// Not exported by the SDK; taken from the beforeSendTransaction option.
type TransactionEvent = Parameters<
  NonNullable<NonNullable<Parameters<typeof Sentry.init>[0]>["beforeSendTransaction"]>
>[0];

// Tenant portal links carry their bearer token in the path.
const PORTAL_TOKEN = /(\/(?:tenant\/bills|api\/tenant-portal)\/)[^/?#]+/g;

/** Replaces tenant-portal tokens in a URL or route name with "[token]". */
export function redactPortalTokens(value: string): string {
  return value.replace(PORTAL_TOKEN, "$1[token]");
}

/**
 * Keeps property data and credentials out of error reports: drops request
 * bodies, cookies, query strings and auth headers, and anything identifying
 * the user beyond their id. Shared by every Sentry.init.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    if (event.request.url) event.request.url = redactPortalTokens(event.request.url);
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.query_string;
    if (event.request.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }
  }
  if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
  if (event.transaction) event.transaction = redactPortalTokens(event.transaction);
  for (const crumb of event.breadcrumbs ?? []) {
    if (typeof crumb.data?.url === "string") crumb.data.url = redactPortalTokens(crumb.data.url);
    if (typeof crumb.data?.to === "string") crumb.data.to = redactPortalTokens(crumb.data.to);
    if (typeof crumb.data?.from === "string") crumb.data.from = redactPortalTokens(crumb.data.from);
  }
  return event;
}

/** Performance traces carry the same URLs and route names. */
export function scrubTransaction(event: TransactionEvent): TransactionEvent {
  if (event.transaction) event.transaction = redactPortalTokens(event.transaction);
  if (event.request?.url) event.request.url = redactPortalTokens(event.request.url);
  return event;
}
