import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function loadSite() {
  vi.resetModules();
  return import("./site");
}

describe("social sharing URLs", () => {
  it("uses the custom canonical domain for the thumbnail", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://property.example/");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "production.vercel.app");
    const { SITE_URL, SOCIAL_IMAGE } = await loadSite();
    expect(SITE_URL).toBe("https://property.example");
    expect(SOCIAL_IMAGE).toMatchObject({ url: "https://property.example/opengraph-image.png", width: 1200, height: 630 });
  });

  it("prefers the production domain to a private preview deployment", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "production.vercel.app");
    vi.stubEnv("VERCEL_URL", "preview-123.vercel.app");
    expect((await loadSite()).SITE_URL).toBe("https://production.vercel.app");
  });

  it.each(["http://landlordsbd.com", "https://landlordsbd.com/", "https://www.landlordsbd.com/"])(
    "uses the final HTTPS www domain when configured with %s",
    async (configuredUrl) => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", configuredUrl);
      const { SITE_URL, SOCIAL_IMAGE } = await loadSite();
      expect(SITE_URL).toBe("https://www.landlordsbd.com");
      expect(SOCIAL_IMAGE.url).toBe("https://www.landlordsbd.com/opengraph-image.png");
    },
  );

  it("uses the public website when hosting variables are unavailable", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("VERCEL_URL", "private-preview.vercel.app");
    expect((await loadSite()).SITE_URL).toBe("https://www.landlordsbd.com");
  });
});
