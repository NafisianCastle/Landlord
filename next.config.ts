import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// Report-only for now: browsers log violations without blocking anything, so
// it can be checked against real traffic (maps, PDF viewer, sign-in,
// payments) before switching to Content-Security-Policy.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://tiles.openfreemap.org https://server.arcgisonline.com https://*.googleusercontent.com",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseUrl} ${supabaseUrl.replace(/^https:/, "wss:")} https://tiles.openfreemap.org https://server.arcgisonline.com https://photon.komoot.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io`,
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com https://*.supabase.co https://securepay.sslcommerz.com https://sandbox.sslcommerz.com",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  // No other site may frame these pages (clickjacking on /profile, /admin…).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=()" },
  { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  experimental: {
    // 20 MiB document + AES-GCM tag and multipart overhead.
    serverActions: { bodySizeLimit: "21mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  // Keep local/CI builds from sending optional Sentry build telemetry.
  telemetry: false,
  // Unset until a real Sentry project exists — see NEXT_PUBLIC_SENTRY_DSN in .env.local.example.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  widenClientFileUpload: true,
});
