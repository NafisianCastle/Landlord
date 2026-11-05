import * as Sentry from "@sentry/nextjs";
import { scrubEvent, scrubTransaction } from "@/lib/sentryScrub";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend: scrubEvent,
  beforeSendTransaction: scrubTransaction,
});
