"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteVendor } from "@/app/actions/vendors";
import { Button } from "@/components/ui/button";

export interface VendorRow {
  id: string;
  name: string;
  trade: string | null;
  phone: string | null;
  notes: string | null;
}

export default function VendorsList({ vendors }: { vendors: VendorRow[] }) {
  const t = useTranslations("VendorsList");
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function remove(id: string) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await deleteVendor(id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {vendors.map((v) => (
          <li key={v.id} className="flex items-start justify-between gap-2 p-3 text-sm">
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{v.name}</span>
              <span className="text-xs text-muted-foreground">
                {[v.trade, v.phone].filter(Boolean).join(" · ")}
              </span>
              {v.notes && <span className="text-xs text-muted-foreground">{v.notes}</span>}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending && pendingId === v.id}
              onClick={() => remove(v.id)}
            >
              {t("delete")}
            </Button>
          </li>
        ))}
        {vendors.length === 0 && (
          <li className="p-3 text-sm text-muted-foreground">{t("noVendorsYet")}</li>
        )}
      </ul>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
