"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteMyAccount, exportMyData } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function YourDataSettings({ email, needsPassword }: { email: string; needsPassword: boolean }) {
  const t = useTranslations("YourData");
  const [exportError, setExportError] = useState<string>();
  const [exporting, startExport] = useTransition();
  const [showDelete, setShowDelete] = useState(false);
  const [state, formAction, deleting] = useActionState(deleteMyAccount, undefined);

  function download() {
    startExport(async () => {
      const result = await exportMyData();
      if (!result.json) return setExportError(result.error);
      const url = URL.createObjectURL(new Blob([result.json], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `landlord-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t("exportHint")}</p>
      <Button type="button" variant="outline" className="w-fit" disabled={exporting} onClick={download}>
        {exporting ? t("exporting") : t("export")}
      </Button>
      {exportError && <p className="text-sm text-destructive">{exportError}</p>}

      {!showDelete ? (
        <Button type="button" variant="destructive" className="w-fit" onClick={() => setShowDelete(true)}>
          {t("delete")}
        </Button>
      ) : (
        <form action={formAction} className="flex flex-col gap-4 rounded-md border border-destructive/40 p-4">
          <p className="text-sm">{t("deleteWarning")}</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmation">{t("typeEmail", { email })}</Label>
            <Input id="confirmation" name="confirmation" type="email" autoComplete="off" required />
          </div>
          {needsPassword && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deletePassword">{t("password")}</Label>
              <Input id="deletePassword" name="password" type="password" required />
            </div>
          )}
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="flex gap-2">
            <Button type="submit" variant="destructive" disabled={deleting}>
              {deleting ? t("deleting") : t("deleteForever")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowDelete(false)}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
