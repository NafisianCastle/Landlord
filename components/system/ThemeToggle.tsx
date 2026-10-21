"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "landlord-theme";
type Theme = "light" | "dark";

let listeners: Array<() => void> = [];
let cached: Theme | undefined;

function computeTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme);
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): Theme {
  if (cached === undefined) {
    cached = computeTheme();
  }
  return cached;
}

function getServerSnapshot(): Theme | null {
  return null;
}

function setTheme(next: Theme) {
  cached = next;
  localStorage.setItem(STORAGE_KEY, next);
  applyTheme(next);
  listeners.forEach((listener) => listener());
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const t = useTranslations("ThemeToggle");

  function toggle() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={!theme}
      onClick={toggle}
      aria-label={t("toggleAriaLabel")}
      title={theme === "dark" ? t("dark") : t("light")}
      className="size-10 shrink-0 rounded-lg border-input bg-card text-card-foreground shadow-sm"
    >
      <Moon className="hidden size-4 dark:block" aria-hidden="true" />
      <Sun className="size-4 dark:hidden" aria-hidden="true" />
    </Button>
  );
}
