"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { encryptJSON, decryptJSON, toPgBytea, fromPgBytea } from "@/lib/crypto/encryption";
import { getSessionDEK, onSessionChange } from "@/lib/crypto/session";
import { DIVISIONS, DISTRICTS, UPAZILAS } from "@/lib/data/bangladesh-geo";

export interface ApartmentSensitiveValues {
  buildingName: string | null;
  unitNumber: string | null;
  purchasePrice: number | null;
  purchaseDate: string | null;
  currentEstimatedValue: number | null;
  notes: string | null;
}

const EMPTY_SENSITIVE: ApartmentSensitiveValues = {
  buildingName: "",
  unitNumber: "",
  purchasePrice: null,
  purchaseDate: "",
  currentEstimatedValue: null,
  notes: "",
};

const SIZE_UNITS = ["sqft", "sqmeter", "katha", "decimal"] as const;

export interface ApartmentMetadataValues {
  name?: string;
  upazila?: string | null;
  district?: string | null;
  division?: string | null;
  floor?: string | null;
  size?: number | null;
  sizeUnit?: string | null;
  /** Plaintext fallback — set when this apartment's sensitive fields were never encrypted. */
  plaintext?: ApartmentSensitiveValues;
  /** Present when this apartment's sensitive fields are stored encrypted (see migration 0017). */
  sensitiveEncryptedHex?: string | null;
  sensitiveIvHex?: string | null;
}

interface ApartmentMetadataFormProps {
  action: (
    prevState: unknown,
    formData: FormData,
  ) => Promise<{ error?: string; success?: boolean } | undefined>;
  initial?: ApartmentMetadataValues;
  submitLabel: string;
}

export default function ApartmentMetadataForm({
  action,
  initial,
  submitLabel,
}: ApartmentMetadataFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const t = useTranslations("ApartmentMetadataForm");

  const isEncryptedRecord = Boolean(initial?.sensitiveEncryptedHex && initial?.sensitiveIvHex);
  const [unlocked, setUnlocked] = useState(() => getSessionDEK() !== null);
  const [sensitive, setSensitive] = useState<ApartmentSensitiveValues>(
    initial?.plaintext ?? EMPTY_SENSITIVE,
  );
  const [decryptError, setDecryptError] = useState<string | null>(null);

  const [divisionName, setDivisionName] = useState(initial?.division ?? "");
  const [districtName, setDistrictName] = useState(initial?.district ?? "");
  const [upazilaName, setUpazilaName] = useState(initial?.upazila ?? "");

  const byName = (n: string) => n.trim().toLowerCase();
  const divisionMatch = DIVISIONS.find((d) => byName(d.name) === byName(divisionName));
  const districtMatch = DISTRICTS.find((d) => byName(d.name) === byName(districtName));
  const upazilaMatch = UPAZILAS.find((u) => byName(u.name) === byName(upazilaName));

  const districtOptions = divisionMatch
    ? DISTRICTS.filter((d) => d.divisionId === divisionMatch.id)
    : DISTRICTS;
  const upazilaOptions = districtMatch
    ? UPAZILAS.filter((u) => u.districtId === districtMatch.id)
    : divisionMatch
      ? UPAZILAS.filter((u) =>
          districtOptions.some((d) => d.id === u.districtId),
        )
      : UPAZILAS;

  useEffect(() => {
    if (!upazilaMatch) return;
    const parentDistrict = DISTRICTS.find((d) => d.id === upazilaMatch.districtId);
    if (parentDistrict && byName(parentDistrict.name) !== byName(districtName)) {
      setDistrictName(parentDistrict.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upazilaName]);

  useEffect(() => {
    if (!districtMatch) return;
    const parentDivision = DIVISIONS.find((d) => d.id === districtMatch.divisionId);
    if (parentDivision && byName(parentDivision.name) !== byName(divisionName)) {
      setDivisionName(parentDivision.name);
    }
    if (upazilaMatch && upazilaMatch.districtId !== districtMatch.id) {
      setUpazilaName("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtName]);

  useEffect(() => {
    if (!divisionMatch) return;
    if (districtMatch && districtMatch.divisionId !== divisionMatch.id) {
      setDistrictName("");
      setUpazilaName("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [divisionName]);

  useEffect(() => onSessionChange(() => setUnlocked(getSessionDEK() !== null)), []);

  useEffect(() => {
    if (!isEncryptedRecord) return;
    const dek = getSessionDEK();
    if (!dek) return;
    let cancelled = false;
    decryptJSON<ApartmentSensitiveValues>(
      fromPgBytea(initial!.sensitiveEncryptedHex!),
      fromPgBytea(initial!.sensitiveIvHex!),
      dek,
    )
      .then((values) => {
        if (!cancelled) setSensitive(values);
      })
      .catch(() => {
        if (!cancelled) setDecryptError(t("decryptError"));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, isEncryptedRecord]);

  const willEncrypt = unlocked;
  const sensitiveLocked = isEncryptedRecord && !unlocked;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!willEncrypt) return;
    e.preventDefault();

    const dek = getSessionDEK();
    if (!dek) return;

    const fd = new FormData(e.currentTarget);
    const { ciphertext, iv } = await encryptJSON(sensitive, dek);
    fd.set("sensitiveEncryptedHex", toPgBytea(ciphertext));
    fd.set("sensitiveIvHex", toPgBytea(iv));
    fd.delete("buildingName");
    fd.delete("unitNumber");
    fd.delete("purchasePrice");
    fd.delete("purchaseDate");
    fd.delete("currentEstimatedValue");
    fd.delete("notes");
    formAction(fd);
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">{t("apartmentName")}</Label>
        <Input
          id="name"
          name="name"
          placeholder={t("apartmentNamePlaceholder")}
          defaultValue={initial?.name ?? ""}
          required
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="buildingName">{t("buildingName")}</Label>
          <Input
            id="buildingName"
            name="buildingName"
            value={sensitive.buildingName ?? ""}
            onChange={(e) => setSensitive((s) => ({ ...s, buildingName: e.target.value }))}
            disabled={sensitiveLocked}
            placeholder={sensitiveLocked ? t("locked") : undefined}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="unitNumber">{t("unitNumber")}</Label>
          <Input
            id="unitNumber"
            name="unitNumber"
            value={sensitive.unitNumber ?? ""}
            onChange={(e) => setSensitive((s) => ({ ...s, unitNumber: e.target.value }))}
            disabled={sensitiveLocked}
            placeholder={sensitiveLocked ? t("locked") : undefined}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="division">{t("division")}</Label>
          <Input
            id="division"
            name="division"
            list="apt-division-options"
            autoComplete="off"
            placeholder={t("selectDivision")}
            value={divisionName}
            onChange={(e) => setDivisionName(e.target.value)}
          />
          <datalist id="apt-division-options">
            {DIVISIONS.map((d) => (
              <option key={d.id} value={d.name} />
            ))}
          </datalist>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="district">{t("district")}</Label>
          <Input
            id="district"
            name="district"
            list="apt-district-options"
            autoComplete="off"
            placeholder={t("selectDistrict")}
            value={districtName}
            onChange={(e) => setDistrictName(e.target.value)}
          />
          <datalist id="apt-district-options">
            {districtOptions.map((d) => (
              <option key={d.id} value={d.name} />
            ))}
          </datalist>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="upazila">{t("upazila")}</Label>
          <Input
            id="upazila"
            name="upazila"
            list="apt-upazila-options"
            autoComplete="off"
            placeholder={t("selectUpazila")}
            value={upazilaName}
            onChange={(e) => setUpazilaName(e.target.value)}
          />
          <datalist id="apt-upazila-options">
            {upazilaOptions.map((u) => (
              <option key={u.id} value={u.name} />
            ))}
          </datalist>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="floor">{t("floor")}</Label>
          <Input id="floor" name="floor" defaultValue={initial?.floor ?? ""} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="size">{t("size")}</Label>
        <div className="flex gap-2">
          <Input
            id="size"
            name="size"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.size ?? ""}
            className="flex-1"
          />
          <select
            id="sizeUnit"
            name="sizeUnit"
            defaultValue={initial?.sizeUnit ?? "sqft"}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm"
          >
            {SIZE_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="purchasePrice">{t("purchasePrice")}</Label>
          <Input
            id="purchasePrice"
            name="purchasePrice"
            type="number"
            step="0.01"
            value={sensitive.purchasePrice ?? ""}
            onChange={(e) =>
              setSensitive((s) => ({
                ...s,
                purchasePrice: e.target.value ? Number(e.target.value) : null,
              }))
            }
            disabled={sensitiveLocked}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="purchaseDate">{t("purchaseDate")}</Label>
          <Input
            id="purchaseDate"
            name="purchaseDate"
            type="date"
            value={sensitive.purchaseDate ?? ""}
            onChange={(e) => setSensitive((s) => ({ ...s, purchaseDate: e.target.value }))}
            disabled={sensitiveLocked}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="currentEstimatedValue">{t("currentEstimatedValue")}</Label>
        <Input
          id="currentEstimatedValue"
          name="currentEstimatedValue"
          type="number"
          step="0.01"
          value={sensitive.currentEstimatedValue ?? ""}
          onChange={(e) =>
            setSensitive((s) => ({
              ...s,
              currentEstimatedValue: e.target.value ? Number(e.target.value) : null,
            }))
          }
          disabled={sensitiveLocked}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">{t("notes")}</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          value={sensitive.notes ?? ""}
          onChange={(e) => setSensitive((s) => ({ ...s, notes: e.target.value }))}
          disabled={sensitiveLocked}
          placeholder={sensitiveLocked ? t("notesLockedPlaceholder") : undefined}
        />
      </div>
      {sensitiveLocked && (
        <p className="text-xs text-muted-foreground">{t("sensitiveLockedNotice")}</p>
      )}
      {decryptError && <p className="text-sm text-destructive">{decryptError}</p>}
      {willEncrypt && (
        <p className="text-xs text-muted-foreground">{t("willEncryptNotice")}</p>
      )}
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-muted-foreground">{t("saved")}</p>}
      <Button type="submit" disabled={pending || sensitiveLocked}>
        {pending ? t("saving") : submitLabel}
      </Button>
    </form>
  );
}
