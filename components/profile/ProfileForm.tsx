"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateProfile } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfileForm({
  email,
  fullName,
}: {
  email: string;
  fullName: string;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, undefined);
  const t = useTranslations("ProfileForm");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" value={email} disabled />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullName">{t("fullName")}</Label>
        <Input id="fullName" name="fullName" defaultValue={fullName} placeholder={t("namePlaceholder")} />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-muted-foreground">{t("profileUpdated")}</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? t("saving") : t("saveChanges")}
      </Button>
    </form>
  );
}
