"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "landlord-theme";
type Theme = "light" | "dark";

let listeners: Array<() => void> = [];
let cached: Theme | undefined;

function computeTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
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

  function toggle() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  if (!theme) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light/dark mode"
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-card-foreground shadow-sm"
    >
      {theme === "dark" ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}
