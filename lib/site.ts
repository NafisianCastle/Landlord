// Canonical site URL for SEO (metadataBase, sitemap, robots, OG/canonical
// tags). Set NEXT_PUBLIC_SITE_URL to the real production domain before
// launch — VERCEL_URL is preview-deploy-specific and not what should get
// indexed.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
