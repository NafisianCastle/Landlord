import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    // 20 MiB document + AES-GCM tag and multipart overhead.
    serverActions: { bodySizeLimit: "21mb" },
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  // Unset until a real Sentry project exists — see NEXT_PUBLIC_SENTRY_DSN in .env.local.example.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  widenClientFileUpload: true,
});
