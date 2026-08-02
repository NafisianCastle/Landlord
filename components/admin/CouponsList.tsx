"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toggleCoupon } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

export interface CouponRow {
  id: string;
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  active: boolean;
  maxRedemptions: number | null;
  timesRedeemed: number;
  expiresAt: string | null;
}

export default function CouponsList({ coupons }: { coupons: CouponRow[] }) {
  const t = useTranslations("AdminCouponsList");
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  function toggle(id: string, active: boolean) {
    setPendingId(id);
    startTransition(async () => {
      await toggleCoupon(id, active);
    });
  }

  return (
    <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
      {coupons.map((c) => (
        <li key={c.id} className="flex items-center justify-between gap-2 p-3 text-sm">
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{c.code}</span>
            <span className="text-xs text-muted-foreground">
              {c.discountType === "percent" ? `${c.discountValue}%` : `BDT ${c.discountValue}`}
              {" · "}
              {t("redeemed", { count: c.timesRedeemed, max: c.maxRedemptions ?? "∞" })}
              {c.expiresAt ? ` · ${t("expires", { date: c.expiresAt })}` : ""}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending && pendingId === c.id}
            onClick={() => toggle(c.id, !c.active)}
          >
            {c.active ? t("deactivate") : t("activate")}
          </Button>
        </li>
      ))}
      {coupons.length === 0 && (
        <li className="p-3 text-sm text-muted-foreground">{t("noCouponsYet")}</li>
      )}
    </ul>
  );
}
