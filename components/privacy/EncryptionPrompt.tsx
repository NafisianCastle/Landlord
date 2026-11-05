import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

/** Nudges owners who haven't turned on client-side encryption yet. */
export default async function EncryptionPrompt() {
  const t = await getTranslations("EncryptionPrompt");
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/40 p-3 text-sm sm:flex-row sm:items-center">
      <LockKeyhole className="size-5 shrink-0 text-primary" aria-hidden="true" />
      <p className="flex-1 text-muted-foreground">{t("text")}</p>
      <Button variant="outline" size="sm" asChild>
        <Link href="/profile#encryption">{t("cta")}</Link>
      </Button>
    </div>
  );
}
