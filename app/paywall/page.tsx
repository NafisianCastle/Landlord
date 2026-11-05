import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { hasActiveAccess } from "@/lib/access";
import { getAppSettings } from "@/lib/settings";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ThemeToggle from "@/components/system/ThemeToggle";
import LocaleSwitcher from "@/components/system/LocaleSwitcher";
import PayButton from "@/components/payments/PayButton";
import Logo from "@/components/system/Logo";

export default async function PaywallPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Access already active (trial or paid) — nothing to pay for, send them in.
  if (await hasActiveAccess(user.id)) redirect("/dashboard");

  const t = await getTranslations("PaywallPage");
  const statusKey =
    status === "failed" || status === "cancelled" || status === "error" ? status : undefined;
  const { lifetimePriceBdt } = await getAppSettings();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col gap-4 p-6">
      <div className="flex items-center justify-between pt-2">
        <Logo className="size-8 rounded-lg" />
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-4">
        <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <h1 className="text-2xl font-semibold">{t("trialEnded")}</h1>
          <p className="text-muted-foreground">{t("pitch")}</p>
          <p className="text-3xl font-bold">
            {t("price", { amount: lifetimePriceBdt.toLocaleString() })}
          </p>
          {statusKey && <p className="text-sm text-destructive">{t(`status.${statusKey}`)}</p>}
          <form action="/api/payments/bkash/init" method="POST" className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="couponCode">{t("couponCode")}</Label>
              <Input id="couponCode" name="couponCode" placeholder={t("couponCodePlaceholder")} />
            </div>
            <PayButton />
          </form>
          <Link href="/refund" className="text-center text-xs text-muted-foreground underline">
            {t("refundPolicyLink")}
          </Link>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
