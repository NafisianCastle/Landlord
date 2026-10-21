import { getTranslations } from "next-intl/server";
import { getAdminCoupons } from "@/lib/adminData";
import { Card, CardContent } from "@/components/ui/card";
import CouponForm from "@/components/admin/CouponForm";
import CouponsList, { type CouponRow } from "@/components/admin/CouponsList";

export default async function AdminCouponsPage() {
  const t = await getTranslations("AdminCouponsPage");
  const rows: CouponRow[] = await getAdminCoupons();

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
