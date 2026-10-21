"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createCoupon } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function CouponForm() {
  const [state, formAction, pending] = useActionState(createCoupon, undefined);
  const t = useTranslations("AdminCouponForm");

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code">{t("code")}</Label>
          <Input id="code" name="code" placeholder="LAUNCH20" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="discountType">{t("discountType")}</Label>
          <Select
            id="discountType"
            name="discountType"
            defaultValue="percent"
          >
            <option value="percent">{t("percent")}</option>
            <option value="fixed">{t("fixed")}</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="discountValue">{t("discountValue")}</Label>
          <Input id="discountValue" name="discountValue" type="number" min="1" step="0.01" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="maxRedemptions">{t("maxRedemptions")}</Label>
          <Input id="maxRedemptions" name="maxRedemptions" type="number" min="1" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expiresAt">{t("expiresAt")}</Label>
          <Input id="expiresAt" name="expiresAt" type="date" />
        </div>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-fit" disabled={pending}>
        {pending ? t("creating") : t("create")}
      </Button>
    </form>
  );
}
