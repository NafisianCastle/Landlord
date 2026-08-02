import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";
import RegisterServiceWorker from "@/components/system/RegisterServiceWorker";
import ReferralCapture from "@/components/system/ReferralCapture";
import Footer from "@/components/system/Footer";
import { SITE_URL } from "@/lib/site";

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("landlord-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.classList.add(t);}catch(e){}})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Landlord — Land, Apartment & Rent Management for Bangladesh",
    template: "%s · Landlord",
  },
  description:
    "Map land boundaries, track apartments, manage leases and rent collection, and store ownership documents — offline-first, built for Bangladeshi landlords.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Landlord",
  },
  openGraph: {
    type: "website",
    siteName: "Landlord",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <RegisterServiceWorker />
          <ReferralCapture />
          <div className="flex flex-1 flex-col">{children}</div>
          <Footer />
          <Analytics />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
