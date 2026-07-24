import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { hasActiveAccess } from "@/lib/access";
import { LIFETIME_PRICE_BDT } from "@/lib/sslcommerz";
import { Card, CardContent } from "@/components/ui/card";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Access already active (trial or paid) — nothing to pay for, send them in.
  if (await hasActiveAccess(user.id)) redirect("/dashboard");

  const t = await getTranslations("PaywallPage");
  const statusKey =
    status === "failed" || status === "cancelled" || status === "error" ? status : undefined;

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
            {t("price", { amount: LIFETIME_PRICE_BDT.toLocaleString() })}
          </p>
          {statusKey && <p className="text-sm text-destructive">{t(`status.${statusKey}`)}</p>}
          <form action="/api/payments/sslcommerz/init" method="POST">
            <PayButton />
          </form>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
