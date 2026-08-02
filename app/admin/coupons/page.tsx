import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import CouponForm from "@/components/admin/CouponForm";
import CouponsList, { type CouponRow } from "@/components/admin/CouponsList";

export default async function AdminCouponsPage() {
  const t = await getTranslations("AdminCouponsPage");
  const admin = createAdminClient();

  const { data: coupons } = await admin
    .from("referral_coupons")
    .select("id, code, discount_type, discount_value, active, max_redemptions, times_redeemed, expires_at")
    .order("created_at", { ascending: false });

  const rows: CouponRow[] = (coupons ?? []).map((c) => ({
    id: c.id,
    code: c.code,
    discountType: c.discount_type,
    discountValue: c.discount_value,
    active: c.active,
    maxRedemptions: c.max_redemptions,
    timesRedeemed: c.times_redeemed,
    expiresAt: c.expires_at,
  }));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <CouponsList coupons={rows} />
      <Card>
        <CardContent className="pt-6">
          <CouponForm />
        </CardContent>
      </Card>
    </div>
  );
}
