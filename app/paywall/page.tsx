import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasActiveAccess } from "@/lib/access";
import { LIFETIME_PRICE_BDT } from "@/lib/sslcommerz";
import { Card, CardContent } from "@/components/ui/card";
import ThemeToggle from "@/components/system/ThemeToggle";
import PayButton from "@/components/payments/PayButton";
import Logo from "@/components/system/Logo";

const STATUS_MESSAGES: Record<string, string> = {
  failed: "Payment failed — please try again.",
  cancelled: "Payment was cancelled.",
  error: "Something went wrong starting the payment. Please try again.",
};

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

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col gap-4 p-6">
      <div className="flex items-center justify-between pt-2">
        <Logo className="size-8 rounded-lg" />
        <ThemeToggle />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-4">
        <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <h1 className="text-2xl font-semibold">Your free trial has ended</h1>
          <p className="text-muted-foreground">
            Pay once, use Landlord for life — no renewals, no subscription.
          </p>
          <p className="text-3xl font-bold">
            BDT {LIFETIME_PRICE_BDT.toLocaleString()}
          </p>
          {status && STATUS_MESSAGES[status] && (
            <p className="text-sm text-destructive">{STATUS_MESSAGES[status]}</p>
          )}
          <form action="/api/payments/sslcommerz/init" method="POST">
            <PayButton />
          </form>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
