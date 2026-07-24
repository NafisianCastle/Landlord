"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function PayButton() {
  const [submitting, setSubmitting] = useState(false);
  const t = useTranslations("PayButton");

  return (
    <Button
      type="submit"
      className="w-full"
      disabled={submitting}
      onClick={() => setSubmitting(true)}
    >
      {submitting ? t("redirecting") : t("payWith")}
    </Button>
  );
}
