import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MapPin, Building2, Wallet, Bell, Wrench, ShieldCheck, WifiOff, FileSpreadsheet } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { SITE_URL } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Logo from "@/components/system/Logo";
import ThemeToggle from "@/components/system/ThemeToggle";
import LocaleSwitcher from "@/components/system/LocaleSwitcher";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("LandingPage");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: SITE_URL },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      url: SITE_URL,
    },
    twitter: {
      title: t("metaTitle"),
      description: t("metaDescription"),
    },
  };
}

const FEATURE_ICONS = [MapPin, Building2, Wallet, Bell, Wrench, ShieldCheck, WifiOff, FileSpreadsheet] as const;

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const t = await getTranslations("LandingPage");

  const features = FEATURE_ICONS.map((Icon, i) => ({
    Icon,
    title: t(`features.${i}.title`),
    description: t(`features.${i}.description`),
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Landlord",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: t("metaDescription"),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BDT",
    },
  };

  return (
    <div className="flex flex-1 flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-y-3 p-4 md:p-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-8 rounded-lg" />
          <span className="font-semibold">Landlord</span>
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">{t("logIn")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">{t("getStarted")}</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-4 py-16 text-center md:py-24">
        <h1 className="text-3xl font-bold tracking-tight md:text-5xl">{t("heroTitle")}</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">{t("heroSubtitle")}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup">{t("heroCta")}</Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{t("heroTrialNote")}</p>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 md:py-16">
        <h2 className="mb-8 text-center text-2xl font-semibold">{t("featuresTitle")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ Icon, title, description }) => (
            <Card key={title}>
              <CardContent className="flex flex-col gap-2 pt-6">
                <Icon className="size-6 text-primary" aria-hidden="true" />
                <h3 className="font-medium">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-md px-4 py-12 md:py-16">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
            <h2 className="text-xl font-semibold">{t("pricingTitle")}</h2>
            <p className="text-4xl font-bold">{t("pricingAmount")}</p>
            <p className="text-sm text-muted-foreground">{t("pricingHint")}</p>
            <Button asChild className="w-full">
              <Link href="/signup">{t("heroCta")}</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
