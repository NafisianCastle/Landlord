import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  ArrowDown,
  ArrowRight,
  Check,
  MapPin,
  Building2,
  Wallet,
  Bell,
  Wrench,
  ShieldCheck,
  WifiOff,
  FileSpreadsheet,
  Plus,
  LockKeyhole,
} from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { SITE_URL, SOCIAL_IMAGE } from "@/lib/site";
import Logo from "@/components/system/Logo";
import ThemeToggle from "@/components/system/ThemeToggle";
import LocaleSwitcher from "@/components/system/LocaleSwitcher";
import styles from "./landing.module.css";

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
      type: "website",
      siteName: "Landlord",
      images: [SOCIAL_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      images: [SOCIAL_IMAGE],
      title: t("metaTitle"),
      description: t("metaDescription"),
    },
  };
}

const FEATURE_ICONS = [
  MapPin,
  Building2,
  Wallet,
  Bell,
  Wrench,
  ShieldCheck,
  WifiOff,
  FileSpreadsheet,
] as const;

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const t = await getTranslations("LandingPage");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Landlord",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: t("metaDescription"),
    offers: { "@type": "Offer", price: "0", priceCurrency: "BDT" },
  };

  return (
    <div className={styles.landing}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <a href="#main" className={styles.skip}>
        {t("skipToContent")}
      </a>
      <header className={styles.header}>
        <Link href="/" className={styles.wordmark} aria-label="Landlord">
          <Logo className="size-9" />
          <span>
            landlord<span className={styles.brandDot}>.</span>
          </span>
        </Link>
        <nav className={styles.desktopNav} aria-label={t("navigation")}>
          <a href="#features">{t("navFeatures")}</a>
          <a href="#how-it-works">{t("navHow")}</a>
          <a href="#questions">{t("navFaq")}</a>
        </nav>
        <div className={styles.headerActions}>
          <LocaleSwitcher />
          <ThemeToggle />
          <Link href="/login" className={styles.login}>
            {t("logIn")}
          </Link>
          <Link
            href="/signup"
            className={`${styles.button} ${styles.headerCta}`}
          >
            {t("getStarted")} <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </header>
      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span className={styles.statusDot} />
              {t("eyebrow")}
            </p>
            <h1 id="hero-title">
              {t("heroTitle")}
              <br />
              <em>{t("heroAccent")}</em>
            </h1>
            <p className={styles.heroDescription}>{t("heroSubtitle")}</p>
            <div className={styles.heroActions}>
              <Link href="/signup" className={styles.button}>
                {t("heroCta")} <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link
                href="/dashboard"
                prefetch={false}
                className={styles.secondaryButton}
              >
                {t("tryGuest")} <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
            <p className={styles.microcopy}>
              <Check size={14} aria-hidden="true" />
              {t("heroTrialNote")}
            </p>
            <a href="#features" className={styles.explore}>
              <ArrowDown size={15} aria-hidden="true" />
              {t("explore")}
            </a>
          </div>
          <figure className={styles.preview} aria-label={t("previewLabel")}>
            <div className={styles.previewTop}>
              <span className={styles.previewBrand}>
                <Logo className="size-6" />
                landlord.
              </span>
              <span className={styles.demoTag}>{t("demo")}</span>
            </div>
            <div className={styles.previewBody}>
              <div className={styles.previewHeading}>
                <div>
                  <p>{t("preview.eyebrow")}</p>
                  <h2>{t("preview.title")}</h2>
                </div>
                <span className={styles.previewAdd} aria-hidden="true">
                  <Plus size={16} />
                </span>
              </div>
              <div className={styles.previewStats}>
                <div>
                  <span>{t("preview.properties")}</span>
                  <strong>06</strong>
                  <small>{t("preview.propertyBreakdown")}</small>
                </div>
                <div>
                  <span>{t("preview.rent")}</span>
                  <strong>৳48,000</strong>
                  <small className={styles.collected}>
                    <Check size={12} />
                    {t("preview.rentStatus")}
                  </small>
                </div>
              </div>
              <div className={styles.map}>
                <svg
                  viewBox="0 0 500 260"
                  fill="none"
                  aria-hidden="true"
                  preserveAspectRatio="xMidYMid slice"
                >
                  <rect width="500" height="260" fill="var(--map-base)" />
                  <path
                    d="M355-30c-110 90 100 120-30 200s-150 55-165 120"
                    stroke="var(--map-water)"
                    strokeWidth="39"
                  />
                  <g
                    fill="var(--map-parcel)"
                    stroke="var(--map-line)"
                    strokeWidth="2"
                  >
                    <path d="m20 25 100 9-9 65-96-5Z" />
                    <path d="m140 36 91 12-10 58-91-8Z" />
                    <path d="m20 115 89 7-4 91-91-12Z" />
                    <path d="m372 9 108 13-7 67-100-12Z" />
                    <path d="m371 100 100 14-9 62-117-17Z" />
                    <path d="m321 203 148-10-7 59-173-3Z" />
                    <path d="m135 215 91 4-9 39-86-4Z" />
                  </g>
                  <path
                    d="M-20 100 250 123M118-20l-4 139-4 161M247-20l-20 135-39 57M350 92l170 14"
                    stroke="var(--map-road)"
                    strokeWidth="12"
                  />
                  <path
                    d="m144 130 98 13-19 61-91-9Z"
                    fill="#164B3F"
                    fillOpacity=".14"
                    stroke="#29765D"
                    strokeWidth="2.5"
                  />
                  <g fill="#D9F279" stroke="#164B3F" strokeWidth="2">
                    <circle cx="144" cy="130" r="5" />
                    <circle cx="242" cy="143" r="5" />
                    <circle cx="223" cy="204" r="5" />
                    <circle cx="132" cy="195" r="5" />
                  </g>
                  <circle cx="187" cy="166" r="14" fill="#164B3F" />
                  <path
                    d="m182 166 4 4 7-8"
                    stroke="#D9F279"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span className={styles.mapCaption}>
                  <MapPin size={12} aria-hidden="true" />
                  {t("preview.plot")}
                </span>
                <span className={styles.mapKey}>{t("preview.boundary")}</span>
              </div>
              <div className={styles.previewRow}>
                <span className={styles.documentIcon}>
                  <ShieldCheck size={17} />
                </span>
                <div>
                  <strong>{t("preview.documents")}</strong>
                  <small>{t("preview.documentsHint")}</small>
                </div>
                <Check
                  size={16}
                  className={styles.collected}
                  aria-hidden="true"
                />
              </div>
            </div>
            <figcaption className={styles.previewNote}>
              {t("previewNote")}
            </figcaption>
          </figure>
        </section>
        <div className={styles.trustStrip}>
          {[
            { Icon: MapPin, key: "local" },
            { Icon: WifiOff, key: "offline" },
            { Icon: ShieldCheck, key: "private" },
          ].map(({ Icon, key }) => (
            <p key={key}>
              <Icon size={18} aria-hidden="true" />
              <span>{t(`trust.${key}`)}</span>
            </p>
          ))}
        </div>
        <section
          id="features"
          className={styles.section}
          aria-labelledby="features-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>{t("featuresEyebrow")}</p>
              <h2 id="features-title">{t("featuresTitle")}</h2>
            </div>
            <p>{t("featuresIntro")}</p>
          </div>
          <div className={styles.featureGrid}>
            {[0, 1, 2, 5].map((index, position) => {
              const Icon = FEATURE_ICONS[index];
              return (
                <article
                  key={index}
                  className={`${styles.feature} ${position === 0 ? styles.featureLead : ""}`}
                >
                  <span className={styles.featureNumber}>0{position + 1}</span>
                  <Icon size={27} strokeWidth={1.5} aria-hidden="true" />
                  <h3>{t(`features.${index}.title`)}</h3>
                  <p>{t(`features.${index}.description`)}</p>
                  <span className={styles.featureDetail}>
                    {t(`featureDetails.${position}`)}
                  </span>
                </article>
              );
            })}
          </div>
          <div className={styles.moreFeatures}>
            {[3, 4, 6, 7].map((index) => {
              const Icon = FEATURE_ICONS[index];
              return (
                <div key={index}>
                  <Icon size={21} aria-hidden="true" />
                  <h3>{t(`features.${index}.title`)}</h3>
                  <p>{t(`features.${index}.description`)}</p>
                </div>
              );
            })}
          </div>
        </section>
        <section
          id="how-it-works"
          className={`${styles.section} ${styles.how}`}
          aria-labelledby="how-title"
        >
          <p className={styles.eyebrow}>{t("howEyebrow")}</p>
          <h2 id="how-title">{t("howTitle")}</h2>
          <ol className={styles.steps}>
            {[0, 1, 2].map((index) => (
              <li key={index}>
                <span>0{index + 1}</span>
                <h3>{t(`steps.${index}.title`)}</h3>
                <p>{t(`steps.${index}.description`)}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className={styles.privacy} aria-labelledby="privacy-title">
          <div className={styles.privacyIcon}>
            <LockKeyhole size={34} strokeWidth={1.5} aria-hidden="true" />
          </div>
          <div>
            <p className={styles.eyebrow}>{t("privacyEyebrow")}</p>
            <h2 id="privacy-title">{t("privacyTitle")}</h2>
            <p>{t("privacyText")}</p>
          </div>
          <Link href="/privacy" className={styles.privacyLink}>
            {t("privacyCta")}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </section>
        <section
          id="questions"
          className={`${styles.section} ${styles.faq}`}
          aria-labelledby="faq-title"
        >
          <div>
            <p className={styles.eyebrow}>{t("faqEyebrow")}</p>
            <h2 id="faq-title">{t("faqTitle")}</h2>
          </div>
          <div>
            {[0, 1, 2, 3].map((index) => (
              <details className={styles.question} key={index}>
                <summary>
                  {t(`faq.${index}.question`)}
                  <Plus size={18} aria-hidden="true" />
                </summary>
                <p>{t(`faq.${index}.answer`)}</p>
              </details>
            ))}
          </div>
        </section>
        <section className={styles.finalCta} aria-labelledby="cta-title">
          <p className={styles.eyebrow}>{t("closingEyebrow")}</p>
          <h2 id="cta-title">{t("closingTitle")}</h2>
          <p>{t("pricingHint")}</p>
          <Link href="/signup" className={styles.limeButton}>
            {t("heroCta")}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <span>{t("closingNote")}</span>
        </section>
      </main>
      <div className={styles.brandFooter}>
        <Link href="/" className={styles.wordmark}>
          <Logo className="size-7" />
          <span>landlord.</span>
        </Link>
        <p>{t("tagline")}</p>
        <a href="#main">{t("backToTop")} ↑</a>
      </div>
    </div>
  );
}
