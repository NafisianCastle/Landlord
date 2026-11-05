"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Languages, LoaderCircle } from "lucide-react";
import { setLocale } from "@/app/actions/locale";
import { locales, localeNames, type Locale } from "@/i18n/routing";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function LocaleSwitcher({ side = "bottom", align = "end" }: {
  side?: "top" | "bottom"; align?: "start" | "end";
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations("LocaleSwitcher");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  return <div className="relative shrink-0">
    <Select value={locale} side={side} align={align} disabled={isPending}
      aria-label={`${t("label")}: ${localeNames[locale]}`} aria-busy={isPending}
      className="h-10 w-auto rounded-lg bg-card px-2.5 text-xs font-medium sm:px-3"
      leadingIcon={isPending ? <LoaderCircle className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Languages className="size-3.5 shrink-0" aria-hidden="true" />}
      onOpenChange={open => {if (open) setFailed(false);}}
      onValueChange={next => {
        if (next === locale) return;
        setFailed(false);
        startTransition(async () => {
          try { await setLocale(next as Locale); router.refresh(); }
          catch { setFailed(true); }
        });
      }}>
      {locales.map(code => <option key={code} value={code} lang={code}>{localeNames[code]}</option>)}
    </Select>
    <span className="sr-only" role="status">{isPending ? t("changing") : ""}</span>
    {failed && <p role="alert" className={cn("absolute z-50 w-52 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card p-3 text-xs text-destructive shadow-lg", side === "top" ? "bottom-full mb-2" : "top-full mt-2", align === "start" ? "left-0" : "right-0")}>{t("failed")}</p>}
  </div>;
}
