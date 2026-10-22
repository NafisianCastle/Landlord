"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { deleteVendor } from "@/app/actions/vendors";
import { Button } from "@/components/ui/button";
import UndoToast from "@/components/ui/undo-toast";
import { useUndoableDelete } from "@/lib/hooks/useUndoableDelete";
import EditVendorButton from "@/components/vendors/EditVendorButton";

export interface VendorRow {
  id: string;
  name: string;
  trade: string | null;
  phone: string | null;
  notes: string | null;
}

export default function VendorsList({ vendors }: { vendors: VendorRow[] }) {
  const t = useTranslations("VendorsList");
  const [error, setError] = useState<string | null>(null);
  const { hidden, pendingUndo, remove, undo } = useUndoableDelete(deleteVendor, setError);
  const shown = vendors.filter((v) => !hidden.has(v.id));

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {shown.map((v) => (
          <li key={v.id} className="flex items-start justify-between gap-2 p-3 text-sm motion-safe:animate-fade-up">
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{v.name}</span>
              <span className="text-xs text-muted-foreground">
                {[v.trade, v.phone].filter(Boolean).join(" · ")}
              </span>
              {v.notes && <span className="text-xs text-muted-foreground">{v.notes}</span>}
            </div>
            <div className="flex shrink-0 gap-1">
              <EditVendorButton vendor={v} />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setError(null);
                  remove(v.id);
                }}
              >
                {t("delete")}
              </Button>
            </div>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="p-3 text-sm text-muted-foreground">{t("noVendorsYet")}</li>
        )}
      </ul>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <UndoToast open={pendingUndo} onUndo={undo} />
    </div>
  );
}
