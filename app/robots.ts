import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/plots", "/apartments", "/leases", "/profile", "/admin", "/paywall", "/api"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
