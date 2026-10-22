"use client";

import { useTranslations } from "next-intl";

/** Bottom toast offered while a deleted item can still be restored. */
export default function UndoToast({ open, onUndo }: { open: boolean; onUndo: () => void }) {
  const t = useTranslations("Common");
  if (!open) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-lg bg-foreground px-4 py-3 text-sm text-background shadow-lg motion-safe:animate-fade-up md:bottom-6"
    >
      <span>{t("deleted")}</span>
      <button
        type="button"
        onClick={onUndo}
        className="rounded-md px-2 py-1 font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {t("undo")}
      </button>
    </div>
  );
}
