"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { grantLifetimeAccess } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

export default function GrantAccessButton({ userId }: { userId: string }) {
  const t = useTranslations("AdminUsersPage");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleClick() {
    startTransition(async () => {
      const result = await grantLifetimeAccess(userId);
      if (!result?.error) setDone(true);
    });
  }

  if (done) return <span className="text-xs text-muted-foreground">{t("granted")}</span>;

  return (
    <Button type="button" variant="outline" size="sm" disabled={pending} onClick={handleClick}>
      {pending ? t("granting") : t("grantAccess")}
    </Button>
  );
}
