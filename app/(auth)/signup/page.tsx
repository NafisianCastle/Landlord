"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { signUp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "@/components/system/Logo";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUp, undefined);
  const t = useTranslations("SignupPage");

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4 p-6">
      <Logo className="mx-auto size-12 rounded-xl" />
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">{t("fullName")}</Label>
              <Input id="fullName" name="fullName" type="text" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                aria-invalid={!!state?.error}
                className={state?.error ? "border-destructive" : undefined}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={10}
                aria-invalid={!!state?.error}
                className={state?.error ? "border-destructive" : undefined}
              />
            </div>
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
            {state?.success && (
              <p className="text-sm text-green-600 dark:text-green-500">
                {t("successMessage")}
              </p>
            )}
            <Button type="submit" disabled={pending || state?.success}>
              {pending ? t("creatingAccount") : t("createAccount")}
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="text-center text-sm">
        {t("haveAccount")}{" "}
        <Link href="/login" className="underline">
          {t("logIn")}
        </Link>
      </p>
    </div>
  );
}
