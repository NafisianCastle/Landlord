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
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

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
        <CardContent className="flex flex-col gap-4">
          <GoogleSignInButton />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            {t("orContinueWithEmail")}
            <div className="h-px flex-1 bg-border" />
          </div>
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
            <p className="text-xs text-muted-foreground">
              {t.rich("agreeToTerms", {
                terms: (chunks) => (
                  <Link href="/terms" className="underline">
                    {chunks}
                  </Link>
                ),
                privacy: (chunks) => (
                  <Link href="/privacy" className="underline">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
            <Button type="submit" className="w-full" disabled={pending}>
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
