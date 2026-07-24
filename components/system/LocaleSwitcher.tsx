"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { setLocale } from "@/app/actions/locale";
import { locales, localeNames, type Locale } from "@/i18n/routing";

export default function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const t = useTranslations("LocaleSwitcher");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange(next: Locale) {
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <label className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2.5 text-xs text-card-foreground shadow-sm">
      <Languages className="size-3.5" />
      <span className="sr-only">{t("label")}</span>
      <select
        aria-label={t("label")}
        value={locale}
        disabled={isPending}
        onChange={(event) => onChange(event.target.value as Locale)}
        className="bg-transparent focus:outline-none"
      >
        {locales.map((code) => (
          <option key={code} value={code}>
            {localeNames[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
