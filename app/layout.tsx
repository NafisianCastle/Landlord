import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
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
    default: "Landlord — Your property, in order",
    template: "%s · Landlord",
  },
  description:
    "Manage land, apartments, rent records, and property documents in one place. Built for property owners in Bangladesh. Free to use.",
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
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F8F2" },
    { media: "(prefers-color-scheme: dark)", color: "#10231C" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const shellMessages = {
    ThemeToggle: messages.ThemeToggle,
    LocaleSwitcher: messages.LocaleSwitcher,
    ErrorPage: messages.ErrorPage,
  };

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
        <NextIntlClientProvider messages={shellMessages}>
          <RegisterServiceWorker />
          <ReferralCapture />
          <div className="flex flex-1 flex-col">{children}</div>
          <Footer />
          {process.env.VERCEL === "1" && <Analytics />}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
