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

export interface SensitiveValues {
  village: string | null;
  mutationNumber: string | null;
  purchasePrice: number | null;
  purchaseDate: string | null;
  currentEstimatedValue: number | null;
  notes: string | null;
}

const EMPTY_SENSITIVE: SensitiveValues = {
  village: "",
  mutationNumber: "",
  purchasePrice: null,
  purchaseDate: "",
  currentEstimatedValue: null,
  notes: "",
};

const AREA_UNITS = ["decimal", "katha", "bigha", "acre", "sqft", "sqmeter"];

export interface PlotMetadataValues {
  name?: string;
  upazila?: string | null;
  district?: string | null;
  division?: string | null;
  dolilArea?: number | null;
  dolilAreaUnit?: string | null;
  actualArea?: number | null;
  actualAreaUnit?: string | null;
  /** Plaintext fallback — set when this plot's sensitive fields were never encrypted. */
  plaintext?: SensitiveValues;
  /** Present when this plot's sensitive fields are stored encrypted (see migration 0009). */
  sensitiveEncryptedHex?: string | null;
  sensitiveIvHex?: string | null;
}

interface PlotMetadataFormProps {
  action: (
    prevState: unknown,
    formData: FormData,
  ) => Promise<{ error?: string; success?: boolean } | undefined>;
  initial?: PlotMetadataValues;
  submitLabel: string;
}

export default function PlotMetadataForm({
  action,
  initial,
  submitLabel,
}: PlotMetadataFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const t = useTranslations("PlotMetadataForm");

  const isEncryptedRecord = Boolean(initial?.sensitiveEncryptedHex && initial?.sensitiveIvHex);
  const [unlocked, setUnlocked] = useState(() => getSessionDEK() !== null);
  const [sensitive, setSensitive] = useState<SensitiveValues>(
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
    decryptJSON<SensitiveValues>(
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
    // Re-run whenever the session unlocks so a mid-page unlock fills the fields in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, isEncryptedRecord]);

  const willEncrypt = unlocked; // once unlocked, saves always go out encrypted
  const sensitiveLocked = isEncryptedRecord && !unlocked;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!willEncrypt) return; // plaintext path: let the form submit normally
    e.preventDefault();

    const dek = getSessionDEK();
    if (!dek) return;

    const fd = new FormData(e.currentTarget);
    const { ciphertext, iv } = await encryptJSON(sensitive, dek);
    fd.set("sensitiveEncryptedHex", toPgBytea(ciphertext));
    fd.set("sensitiveIvHex", toPgBytea(iv));
    fd.delete("village");
    fd.delete("mutationNumber");
    fd.delete("purchasePrice");
    fd.delete("purchaseDate");
    fd.delete("currentEstimatedValue");
    fd.delete("notes");
    formAction(fd);
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">{t("plotName")}</Label>
        <Input
          id="name"
          name="name"
          placeholder={t("plotNamePlaceholder")}
          defaultValue={initial?.name ?? ""}
          required
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="village">{t("village")}</Label>
          <Input
            id="village"
            name="village"
            value={sensitive.village ?? ""}
            onChange={(e) => setSensitive((s) => ({ ...s, village: e.target.value }))}
            disabled={sensitiveLocked}
            placeholder={sensitiveLocked ? t("locked") : undefined}
          />
        </div>
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
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dolilArea">{t("dolilArea")}</Label>
          <div className="flex gap-2">
            <Input
              id="dolilArea"
              name="dolilArea"
              type="number"
              step="0.0001"
              min="0"
              defaultValue={initial?.dolilArea ?? ""}
              className="flex-1"
            />
            <Select
              id="dolilAreaUnit"
              aria-label={t("dolilAreaUnit")}
              className="w-28 shrink-0"
              name="dolilAreaUnit"
              defaultValue={initial?.dolilAreaUnit ?? "decimal"}
            >
              {unitOptions(AREA_UNITS, initial?.dolilAreaUnit).map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">{t("dolilAreaHint")}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="actualArea">{t("actualArea")}</Label>
          <div className="flex gap-2">
            <Input
              id="actualArea"
              name="actualArea"
              type="number"
              step="0.0001"
              min="0"
              defaultValue={initial?.actualArea ?? ""}
              className="flex-1"
            />
            <Select
              id="actualAreaUnit"
              aria-label={t("actualAreaUnit")}
              className="w-28 shrink-0"
              name="actualAreaUnit"
              defaultValue={initial?.actualAreaUnit ?? "decimal"}
            >
              {unitOptions(AREA_UNITS, initial?.actualAreaUnit).map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">{t("actualAreaHint")}</p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mutationNumber">{t("mutationNumber")}</Label>
        <Input
          id="mutationNumber"
          name="mutationNumber"
          value={sensitive.mutationNumber ?? ""}
          onChange={(e) => setSensitive((s) => ({ ...s, mutationNumber: e.target.value }))}
          disabled={sensitiveLocked}
          placeholder={sensitiveLocked ? t("locked") : undefined}
        />
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
