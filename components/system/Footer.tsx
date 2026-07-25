import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function Footer() {
  const t = await getTranslations("Footer");

  return (
    <footer className="mt-auto border-t border-border px-4 py-4 text-center text-xs text-muted-foreground md:px-6">
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <Link href="/terms" className="hover:text-foreground hover:underline">
          {t("terms")}
        </Link>
        <Link href="/privacy" className="hover:text-foreground hover:underline">
          {t("privacy")}
        </Link>
        <Link href="/refund" className="hover:text-foreground hover:underline">
          {t("refund")}
        </Link>
      </nav>
    </footer>
  );
}
