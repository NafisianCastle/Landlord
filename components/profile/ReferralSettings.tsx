"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ReferralSettings({
  referralCode,
  referralCount,
}: {
  referralCode: string;
  referralCount: number;
}) {
  const t = useTranslations("ReferralSettings");
  const [copied, setCopied] = useState(false);

  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/signup?ref=${referralCode}`
      : `/signup?ref=${referralCode}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t("explanation")}</p>
      <div className="flex gap-2">
        <Input readOnly value={link} className="text-sm" />
        <Button type="button" variant="outline" onClick={handleCopy} className="shrink-0">
          {copied ? t("copied") : t("copy")}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{t("referredCount", { count: referralCount })}</p>
    </div>
  );
}
