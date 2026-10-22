// Use the public domain for canonical and social image URLs. Preview deployment
// hosts may require authentication and cannot be fetched by social crawlers.
const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://www.landlordsbd.com"),
);
// Hosting redirects the apex domain to www. Point crawlers straight at the
// final HTTPS URL, including when an older environment setting uses the apex.
if (["landlordsbd.com", "www.landlordsbd.com"].includes(siteUrl.hostname)) {
  siteUrl.protocol = "https:";
  siteUrl.hostname = "www.landlordsbd.com";
  siteUrl.port = "";
}
export const SITE_URL = siteUrl.toString().replace(/\/+$/, "");

export const SOCIAL_IMAGE = {
  url: `${SITE_URL}/opengraph-image.png`,
  width: 1200,
  height: 630,
  type: "image/png",
  alt: "Landlord — Your property, in order. Land, apartments, rent, and documents.",
};
