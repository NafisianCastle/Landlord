"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { signIn } from "@/app/actions/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import DemoSignInButton from "@/components/auth/DemoSignInButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "@/components/system/Logo";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, undefined);
  const t = useTranslations("LoginPage");
  const errorParam = useSearchParams().get("error");
  const oauthError = errorParam === "oauth";
  const accountExistsError = errorParam === "account_exists";

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4 p-6">
      <Logo className="mx-auto size-12 rounded-xl" />
      {process.env.NEXT_PUBLIC_DEMO_LOGIN_ENABLED === "true" && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/40 p-3 text-center">
          <p className="text-sm text-muted-foreground">{t("justLooking")}</p>
          <DemoSignInButton
            label={t("tryDemo")}
            pendingLabel={t("openingDemo")}
            className={buttonVariants({ variant: "outline", className: "w-full" })}
          />
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {accountExistsError && (
            <p className="text-sm text-destructive">{t("accountExistsError")}</p>
          )}
          {oauthError && <p className="text-sm text-destructive">{t("oauthError")}</p>}
          <GoogleSignInButton />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            {t("orContinueWithEmail")}
            <div className="h-px flex-1 bg-border" />
          </div>
          <form action={formAction} className="flex flex-col gap-4">
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
                minLength={6}
                aria-invalid={!!state?.error}
                className={state?.error ? "border-destructive" : undefined}
              />
            </div>
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? t("loggingIn") : t("logIn")}
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="text-center text-sm">
        {t("noAccount")}{" "}
        <Link href="/signup" className="underline">
          {t("signUp")}
        </Link>
      </p>
    </div>
  );
}
