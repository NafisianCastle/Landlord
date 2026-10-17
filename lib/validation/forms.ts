/** Runtime checks for untrusted Server Action arguments, including forged FormData. */
export interface Rule {
  max?: number;
  required?: boolean;
  kind?: "number" | "date" | "email" | "uuid" | "phone";
  min?: number;
  integer?: boolean;
  choices?: readonly string[];
  pattern?: RegExp;
  preserveWhitespace?: boolean;
}
export type Rules = Record<string, Rule>;
export const MAX_MONEY = 1_000_000_000_000;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

export function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "1900-01-01" &&
    value <= "9999-12-31" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function validateForm(form: FormData, rules: Rules): string | null {
  if (!(form instanceof FormData)) return "Invalid form submission.";
  for (const [field, rule] of Object.entries(rules)) {
    const entries = form.getAll(field);
    if (entries.length > 1 || (entries.length && typeof entries[0] !== "string")) {
      return `Invalid ${field}.`;
    }
    const raw = (entries[0] as string | undefined) ?? "";
    const value = rule.preserveWhitespace ? raw : raw.trim();
    // Check raw length before treating whitespace-only optional fields as empty.
    if (raw.length > (rule.max ?? 255) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(raw)) {
      return `${field} is too long or contains invalid characters.`;
    }
    if (!value) {
      if (rule.required) return `${field} is required.`;
      continue;
    }
    if (rule.choices && !rule.choices.includes(value)) return `Invalid ${field}.`;
    if (rule.pattern && !rule.pattern.test(value)) return `Invalid ${field}.`;
    if (rule.kind === "number") {
      const n = Number(value);
      if (!decimal.test(value) || !Number.isFinite(n) || n < (rule.min ?? 0) ||
          n > MAX_MONEY || (rule.integer && !Number.isSafeInteger(n))) return `Invalid ${field}.`;
    }
    if (rule.kind === "date" && !validDate(value)) return `Invalid ${field}.`;
    if (rule.kind === "email" && !EMAIL.test(value)) return `Invalid ${field}.`;
    if (rule.kind === "uuid" && !UUID.test(value)) return `Invalid ${field}.`;
    if (rule.kind === "phone" && !/^[+\d\s().-]{3,32}$/.test(value)) return `Invalid ${field}.`;
  }
  return null;
}

export const money: Rule = { kind: "number", max: 32 };
const date: Rule = { kind: "date", max: 10 };
const areaUnits = ["decimal", "bigha", "katha", "kani", "gonda", "acre", "sqft", "sqmeter", "sqm", "sq_meters", "sq_ft", "sq_km", "sq_mile"];
export const propertyRules: Rules = {
  name: { max: 200, required: true }, upazila: { max: 100 }, district: { max: 100 }, division: { max: 100 },
  village: { max: 200 }, mutationNumber: { max: 100 }, buildingName: { max: 200 },
  unitNumber: { max: 100 }, floor: { max: 50 }, notes: { max: 10000 },
  purchasePrice: money, currentEstimatedValue: money, purchaseDate: date,
  dolilArea: money, actualArea: money, size: money,
  dolilAreaUnit: { choices: areaUnits }, actualAreaUnit: { choices: areaUnits }, sizeUnit: { choices: areaUnits },
};
export function validateProperty(form: FormData): string | null {
  const error = validateForm(form, propertyRules);
  if (error) return error;
  const ciphertext = form.get("sensitiveEncryptedHex");
  const iv = form.get("sensitiveIvHex");
  if (ciphertext || iv) {
    if (form.getAll("sensitiveEncryptedHex").length !== 1 || form.getAll("sensitiveIvHex").length !== 1 ||
        typeof ciphertext !== "string" || ciphertext.length > 65538 ||
        !/^\\x(?:[0-9a-f]{2}){16,}$/i.test(ciphertext) ||
        typeof iv !== "string" || !/^\\x[0-9a-f]{24}$/i.test(iv)) return "Invalid encrypted property data.";
  }
  return null;
}
export const leaseRules: Rules = {
  tenantName: { max: 200 }, tenantPhone: { kind: "phone", max: 32 }, tenantEmail: { kind: "email", max: 254 },
  rentAmount: money, frequency: { choices: ["monthly", "quarterly", "yearly"] },
  startDate: date, endDate: date, notes: { max: 10000 },
};
export function validateLease(form: FormData): string | null {
  const error = validateForm(form, leaseRules);
  if (error) return error;
  const start = String(form.get("startDate") ?? "");
  const end = String(form.get("endDate") ?? "");
  return start && end && end < start ? "Lease end date must be on or after its start date." : null;
}
export const expenseRules: Rules = {
  category: { choices: ["tax", "insurance", "utility", "repair", "management_fee", "other"] },
  amount: money, expenseDate: date, notes: { max: 10000 },
};
export const vendorRules: Rules = {
  name: { max: 200 }, trade: { max: 100 }, phone: { kind: "phone", max: 32 }, notes: { max: 10000 },
};
export const maintenanceRules: Rules = {
  title: { max: 200 }, description: { max: 10000 }, cost: money,
  reportedDate: date, vendorId: { kind: "uuid", max: 36 },
};
