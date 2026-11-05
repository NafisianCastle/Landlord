"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { unitOptions } from "@/lib/units";
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

const SIZE_UNITS = ["sqft", "sqmeter", "katha", "decimal"];

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

  // Selecting a lower level fills in its parents; selecting a higher level clears
  // lower levels that no longer belong to it.
  function selectDivision(name: string) {
    setDivisionName(name);
    const division = DIVISIONS.find((d) => byName(d.name) === byName(name));
    if (division && districtMatch && districtMatch.divisionId !== division.id) {
      setDistrictName("");
      setUpazilaName("");
    }
  }

  function selectDistrict(name: string) {
    setDistrictName(name);
    const district = DISTRICTS.find((d) => byName(d.name) === byName(name));
    if (!district) return;
    const parentDivision = DIVISIONS.find((d) => d.id === district.divisionId);
    if (parentDivision && byName(parentDivision.name) !== byName(divisionName)) {
      setDivisionName(parentDivision.name);
    }
    if (upazilaMatch && upazilaMatch.districtId !== district.id) {
      setUpazilaName("");
    }
  }

  function selectUpazila(name: string) {
    setUpazilaName(name);
    const upazila = UPAZILAS.find((u) => byName(u.name) === byName(name));
    if (!upazila) return;
    const parentDistrict = DISTRICTS.find((d) => d.id === upazila.districtId);
    if (parentDistrict && byName(parentDistrict.name) !== byName(districtName)) {
      setDistrictName(parentDistrict.name);
      const parentDivision = DIVISIONS.find((d) => d.id === parentDistrict.divisionId);
      if (parentDivision && byName(parentDivision.name) !== byName(divisionName)) {
        setDivisionName(parentDivision.name);
      }
    }
  }

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
          <Autocomplete
            id="division"
            name="division"
            placeholder={t("selectDivision")}
            value={divisionName}
            onValueChange={selectDivision}
            options={DIVISIONS.map(item => item.name)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="district">{t("district")}</Label>
          <Autocomplete
            id="district"
            name="district"
            placeholder={t("selectDistrict")}
            value={districtName}
            onValueChange={selectDistrict}
            options={districtOptions.map(item => item.name)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="upazila">{t("upazila")}</Label>
          <Autocomplete
            id="upazila"
            name="upazila"
            placeholder={t("selectUpazila")}
            value={upazilaName}
            onValueChange={selectUpazila}
            options={upazilaOptions.map(item => item.name)}
          />
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
          <Select
            id="sizeUnit"
            aria-label={t("sizeUnit")}
            className="w-28 shrink-0"
            name="sizeUnit"
            defaultValue={initial?.sizeUnit ?? "sqft"}
          >
            {unitOptions(SIZE_UNITS, initial?.sizeUnit).map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </Select>
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
      <Button type="submit" className="w-fit" disabled={pending || sensitiveLocked}>
        {pending ? t("saving") : submitLabel}
      </Button>
    </form>
  );
}
