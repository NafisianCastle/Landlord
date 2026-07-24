"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { changePassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, undefined);
  const t = useTranslations("ChangePasswordForm");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="currentPassword">{t("currentPassword")}</Label>
        <Input id="currentPassword" name="currentPassword" type="password" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="newPassword">{t("newPassword")}</Label>
        <Input id="newPassword" name="newPassword" type="password" required minLength={10} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">{t("confirmNewPassword")}</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={10} />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-muted-foreground">{t("passwordChanged")}</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? t("updating") : t("changePassword")}
      </Button>
    </form>
  );
}
