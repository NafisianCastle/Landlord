"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  updateMaintenanceStatus,
  deleteMaintenanceRequest,
  type MaintenanceSubjectType,
} from "@/app/actions/maintenance";
import { Button } from "@/components/ui/button";
import UndoToast from "@/components/ui/undo-toast";
import { useUndoableDelete } from "@/lib/hooks/useUndoableDelete";

export interface MaintenanceRequestRow {
  id: string;
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "resolved";
  cost: number | null;
  reportedDate: string;
  resolvedDate: string | null;
  vendorName?: string | null;
}

const bdt = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 0,
});

export default function MaintenanceRequestsList({
  requests,
  subjectType,
  subjectId,
}: {
  requests: MaintenanceRequestRow[];
  subjectType: MaintenanceSubjectType;
  subjectId: string;
}) {
  const t = useTranslations("MaintenanceRequestsList");
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setStatus(id: string, status: "open" | "in_progress" | "resolved") {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await updateMaintenanceStatus(id, subjectType, subjectId, status);
      if (result?.error) setError(result.error);
    });
  }

  const { hidden, pendingUndo, remove, undo } = useUndoableDelete(
    (id) => deleteMaintenanceRequest(id, subjectType, subjectId),
    setError,
  );
  const shown = requests.filter((r) => !hidden.has(r.id));

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {shown.map((row) => (
          <li key={row.id} className="flex flex-col gap-2 p-3 text-sm motion-safe:animate-fade-up">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{row.title}</span>
                {row.description && (
                  <span className="text-xs text-muted-foreground">{row.description}</span>
                )}
                <span className="text-xs text-muted-foreground">
                  {t("reportedOn", { date: row.reportedDate })}
                  {row.cost != null ? ` · ${bdt.format(row.cost)}` : ""}
                  {row.vendorName ? ` · ${row.vendorName}` : ""}
                </span>
              </div>
              <span
                className={
                  row.status === "resolved"
                    ? "shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
                    : row.status === "in_progress"
                      ? "shrink-0 rounded-full bg-warning/20 px-2 py-0.5 text-xs text-warning-foreground"
                      : "shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive"
                }
              >
                {t(`status.${row.status}`)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {row.status !== "in_progress" && row.status !== "resolved" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending && pendingId === row.id}
                  onClick={() => setStatus(row.id, "in_progress")}
                >
                  {t("markInProgress")}
                </Button>
              )}
              {row.status !== "resolved" && (
                <Button
                  type="button"
                  size="sm"
                  disabled={pending && pendingId === row.id}
                  onClick={() => setStatus(row.id, "resolved")}
                >
                  {t("markResolved")}
                </Button>
              )}
              {row.status === "resolved" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending && pendingId === row.id}
                  onClick={() => setStatus(row.id, "open")}
                >
                  {t("reopen")}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setError(null);
                  remove(row.id);
                }}
              >
                {t("delete")}
              </Button>
            </div>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="p-3 text-sm text-muted-foreground">{t("noRequestsYet")}</li>
        )}
      </ul>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <UndoToast open={pendingUndo} onUndo={undo} />
    </div>
  );
}
