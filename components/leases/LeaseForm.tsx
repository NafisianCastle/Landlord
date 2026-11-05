"use client";

import { useActionState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { encryptJSON, toPgBytea } from "@/lib/crypto/encryption";
import { getSessionDEK } from "@/lib/crypto/session";
import { useLeaseSecrets, type LeaseSecrets } from "@/lib/crypto/leaseSecrets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FREQUENCIES = ["monthly", "quarterly", "yearly"] as const;

export interface LeaseFormValues {
  tenantName?: string | null;
  tenantPhone?: string | null;
  tenantEmail?: string | null;
  rentAmount?: number | null;
  frequency?: string;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  /** Present when the tenant details are stored encrypted. */
  sensitiveEncryptedHex?: string | null;
  sensitiveIvHex?: string | null;
}

const SECRET_FIELDS = ["tenantName", "tenantPhone", "tenantEmail", "notes"] as const;

interface LeaseFormProps {
  action: (prevState: unknown, formData: FormData) => Promise<{ error?: string } | undefined>;
  subjectType: "plot" | "apartment";
  initial?: LeaseFormValues;
  submitLabel: string;
}

export default function LeaseForm({ action, subjectType, initial, submitLabel }: LeaseFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [encrypting, startEncrypting] = useTransition();
  const t = useTranslations("LeaseForm");
  const tSecrets = useTranslations("LeaseSecrets");
  const { encrypted, secrets } = useLeaseSecrets({
    tenant_name: initial?.tenantName,
    tenant_phone: initial?.tenantPhone,
    tenant_email: initial?.tenantEmail,
    notes: initial?.notes,
    sensitive_encrypted: initial?.sensitiveEncryptedHex,
    sensitive_iv: initial?.sensitiveIvHex,
  });
  // Saving an encrypted lease while locked would wipe its tenant details.
  const locked = encrypted && !secrets;
  const values = { ...initial, ...secrets };

  // With the session unlocked, tenant details always go out encrypted.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const dek = getSessionDEK();
    if (!dek) return; // plaintext path: let the form submit normally
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const text = (key: string) => String(fd.get(key) ?? "").trim() || null;
    const secret: LeaseSecrets = {
      tenantName: text("tenantName"),
      tenantPhone: text("tenantPhone"),
      tenantEmail: text("tenantEmail")?.toLowerCase() ?? null,
      notes: text("notes"),
    };
    startEncrypting(async () => {
      const { ciphertext, iv } = await encryptJSON(secret, dek);
      for (const key of SECRET_FIELDS) fd.delete(key);
      fd.set("sensitiveEncryptedHex", toPgBytea(ciphertext));
      fd.set("sensitiveIvHex", toPgBytea(iv));
      formAction(fd);
    });
  }

  return (
    <form
      key={secrets ? "ready" : "locked"}
      action={formAction}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tenantName">{t("tenantName")}</Label>
          <Input
            id="tenantName"
            name="tenantName"
            defaultValue={values.tenantName ?? ""}
            disabled={locked}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tenantPhone">{t("tenantPhone")}</Label>
          <Input id="tenantPhone" name="tenantPhone" defaultValue={values.tenantPhone ?? ""}
            disabled={locked} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tenantEmail">{t("tenantEmail")}</Label>
          <Input
            id="tenantEmail"
            name="tenantEmail"
            type="email"
            defaultValue={values.tenantEmail ?? ""}
            disabled={locked}
            required={subjectType === "apartment"}
          />
          {subjectType === "apartment" && <p className="text-xs text-muted-foreground">{t("tenantEmailHistoryHint")}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rentAmount">{t("rentAmount")}</Label>
          <Input
            id="rentAmount"
            name="rentAmount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.rentAmount ?? ""}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="frequency">{t("frequency")}</Label>
          <Select
            id="frequency"
            name="frequency"
            defaultValue={initial?.frequency ?? "monthly"}
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {t(`frequencyOption.${f}`)}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startDate">{t("startDate")}</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={initial?.startDate ?? ""}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="endDate">{t("endDate")}</Label>
          <Input id="endDate" name="endDate" type="date" defaultValue={initial?.endDate ?? ""} />
          <p className="text-xs text-muted-foreground">{t("endDateHint")}</p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">{t("notes")}</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={values.notes ?? ""}
            disabled={locked} />
      </div>
      {locked && <p className="text-sm text-muted-foreground">{tSecrets("lockedForm")}</p>}
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-fit" disabled={pending || encrypting || locked}>
        {pending || encrypting ? t("saving") : submitLabel}
      </Button>
    </form>
  );
}
