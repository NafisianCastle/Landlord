"use client";

import { useSyncExternalStore } from "react";

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
      className="fixed right-3 top-3 z-50 rounded-full border bg-white px-3 py-1.5 text-xs shadow dark:bg-neutral-800 dark:text-neutral-100"
    >
      {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
}
