"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { inviteCollaborator, removeCollaborator } from "@/app/actions/plots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import ConfirmDialog from "@/components/ui/confirm-dialog";

interface Collaborator {
  id: string;
  invited_email: string;
  role: string;
}

export default function PlotCollaborators({
  plotId,
  isOwner,
  collaborators,
}: {
  plotId: string;
  isOwner: boolean;
  collaborators: Collaborator[];
}) {
  const t = useTranslations("PlotCollaborators");
  const tCommon = useTranslations("Common");
  const [state, formAction, pending] = useActionState(
    inviteCollaborator.bind(null, plotId),
    undefined,
  );
  const [removing, startRemoving] = useTransition();
  const [removeError, setRemoveError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  function handleRemove(collaboratorId: string) {
    setRemoveError(null);
    startRemoving(async () => {
      const result = await removeCollaborator(plotId, collaboratorId);
      if (result?.error) setRemoveError(result.error);
    });
  }

  if (!isOwner) {
    if (collaborators.length === 0) return null;
    const mine = collaborators[0];
    return (
      <div>
        <h2 className="mb-2 font-medium">{t("title")}</h2>
        <p className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
          {t("sharedByOwner")} {t("sharedAsRole", { role: mine.role })}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 font-medium">{t("title")}</h2>
      <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
        <ul className="flex flex-col divide-y divide-border">
          {collaborators.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="flex items-center gap-2 truncate">
                {c.invited_email} <Badge>{c.role}</Badge>
              </span>
              <ConfirmDialog
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-w-20"
                    disabled={removing}
                  >
                    {removing ? t("removing") : t("remove")}
                  </Button>
                }
                title={t("remove")}
                description={t("removeConfirm", { email: c.invited_email })}
                confirmLabel={t("remove")}
                cancelLabel={tCommon("cancel")}
                onConfirm={() => handleRemove(c.id)}
              />
            </li>
          ))}
          {collaborators.length === 0 && (
            <li className="py-2 text-sm text-muted-foreground">{t("noCollaborators")}</li>
          )}
        </ul>

        <form ref={formRef} action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="collaborator-email">{t("inviteEmail")}</Label>
            <Input id="collaborator-email" name="email" type="email" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="collaborator-role">{t("role")}</Label>
            <Select
              id="collaborator-role"
              name="role"
              defaultValue="editor"
            >
              <option value="viewer">{t("roleViewer")}</option>
              <option value="editor">{t("roleEditor")}</option>
            </Select>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? t("inviting") : t("invite")}
          </Button>
        </form>
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state?.success && <p className="text-sm text-muted-foreground">{t("invited")}</p>}
        {removeError && <p className="text-sm text-destructive">{removeError}</p>}
      </div>
    </div>
  );
}
