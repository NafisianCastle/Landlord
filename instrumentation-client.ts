// Do not download/initialise monitoring when this deployment has no Sentry DSN.
const sentry = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? import("@sentry/nextjs").then((sdk) => {
      sdk.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        tracesSampleRate: 0.1,
      });
      return sdk;
    })
  : undefined;

export const onRouterTransitionStart = (
  ...args: Parameters<
    typeof import("@sentry/nextjs").captureRouterTransitionStart
  >
) => {
  void sentry?.then((sdk) => sdk.captureRouterTransitionStart(...args));
};
