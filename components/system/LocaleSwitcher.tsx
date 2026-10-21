"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Languages, LoaderCircle } from "lucide-react";
import { setLocale } from "@/app/actions/locale";
import { locales, localeNames, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export default function LocaleSwitcher({
  side = "bottom",
  align = "end",
}: {
  side?: "top" | "bottom";
  align?: "start" | "end";
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations("LocaleSwitcher");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(locales.indexOf(locale));
  const [failed, setFailed] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    options.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  function onChange(next: Locale) {
    close();
    if (next === locale) return;
    setFailed(false);
    startTransition(async () => {
      try {
        await setLocale(next);
        router.refresh();
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <div
      ref={container}
      className="relative shrink-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-label={`${t("label")}: ${localeNames[locale]}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-busy={isPending}
        disabled={isPending}
        onClick={() => {
          setFailed(false);
          setActiveIndex(locales.indexOf(locale));
          setOpen(!open);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setFailed(false);
            setActiveIndex(event.key === "ArrowDown" ? 0 : locales.length - 1);
            setOpen(true);
          }
        }}
        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-input bg-card px-2.5 text-xs font-medium text-card-foreground shadow-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60 sm:px-3"
      >
        {isPending ? (
          <LoaderCircle
            className="size-3.5 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <Languages className="size-3.5" aria-hidden="true" />
        )}
        <span lang={locale}>{localeNames[locale]}</span>
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform motion-reduce:transition-none",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t("label")}
          className={cn(
            "absolute z-50 w-44 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card p-1.5 text-card-foreground shadow-lg",
            side === "top" ? "bottom-full mb-2" : "top-full mt-2",
            align === "start" ? "left-0" : "right-0",
          )}
          onKeyDown={(event) => {
            const last = locales.length - 1;
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              close();
            } else if (
              ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
            ) {
              event.preventDefault();
              if (event.key === "Home") setActiveIndex(0);
              if (event.key === "End") setActiveIndex(last);
              if (event.key === "ArrowDown")
                setActiveIndex((index) => (index + 1) % locales.length);
              if (event.key === "ArrowUp")
                setActiveIndex((index) => (index + last) % locales.length);
            } else if (event.key.length === 1 && /[a-z]/i.test(event.key)) {
              const match = locales.findIndex(
                (code) =>
                  localeNames[code]
                    .toLowerCase()
                    .startsWith(event.key.toLowerCase()) ||
                  code.startsWith(event.key.toLowerCase()),
              );
              if (match >= 0) {
                event.preventDefault();
                setActiveIndex(match);
              }
            }
          }}
        >
          {locales.map((code, index) => (
            <button
              key={code}
              ref={(element) => {
                options.current[index] = element;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={code === locale}
              tabIndex={-1}
              onFocus={() => setActiveIndex(index)}
              onClick={() => onChange(code)}
              className={cn(
                "flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-secondary focus:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                code === locale && "bg-primary/10 font-medium text-primary",
              )}
            >
              <span lang={code} className="flex-1">
                {localeNames[code]}
              </span>
              {code === locale ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <span
                  aria-hidden="true"
                  className="text-[10px] uppercase text-muted-foreground"
                >
                  {code}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <span className="sr-only" role="status">
        {isPending ? t("changing") : ""}
      </span>
      {failed && (
        <p
          role="alert"
          className={cn(
            "absolute z-50 w-52 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card p-3 text-xs text-destructive shadow-lg",
            side === "top" ? "bottom-full mb-2" : "top-full mt-2",
            align === "start" ? "left-0" : "right-0",
          )}
        >
          {t("failed")}
        </p>
      )}
    </div>
  );
}
