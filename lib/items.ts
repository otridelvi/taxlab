import { z } from "zod";

/**
 * Items (answers) a step collects (FSD-Participant §8.1). The spec carries
 * both the validation rule and what the browser shows, so it can be passed
 * to the client form as-is.
 */
export type ContactField = "name" | "email" | "ewallet" | "phone";

export type ChoiceItem = {
  key: string;
  type: "choice";
  /** Question text (trusted HTML). */
  legend: string;
  /** Option labels (trusted HTML); stored value = 1-based index. */
  options: readonly string[];
  /** Short name used in "Lengkapi … terlebih dahulu." */
  name: string;
};

export type TextItem = {
  key: string;
  type: "text" | "email";
  label: string;
  name: string;
  autoComplete?: string;
  maxLength: number;
  /** Stored in `contacts.<field>` instead of `responses`. */
  contact?: ContactField;
};

export type ItemSpec = ChoiceItem | TextItem;
export type ItemValues = Record<string, unknown>;

const emailSchema = z.email();

/**
 * Checks one value. "draft" (autosave) accepts unfinished text so typing is
 * never blocked; "final" (Next) requires a complete, valid answer.
 * Returns the cleaned value, "empty", or "invalid".
 */
export function checkItem(
  spec: ItemSpec,
  raw: unknown,
  mode: "draft" | "final",
): { ok: true; value: number | string } | { ok: false; reason: "empty" | "invalid" } {
  if (spec.type === "choice") {
    if (raw === null || raw === undefined || raw === "") return { ok: false, reason: "empty" };
    const n = typeof raw === "string" ? Number(raw) : raw;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > spec.options.length) {
      return { ok: false, reason: "invalid" };
    }
    return { ok: true, value: n };
  }
  if (raw !== undefined && raw !== null && typeof raw !== "string") return { ok: false, reason: "invalid" };
  const text = (raw ?? "").trim();
  if (text.length > spec.maxLength) return { ok: false, reason: "invalid" };
  if (mode === "draft") return { ok: true, value: spec.type === "email" ? text.toLowerCase() : text };
  if (!text) return { ok: false, reason: "empty" };
  if (spec.type === "email") {
    const email = text.toLowerCase();
    return emailSchema.safeParse(email).success
      ? { ok: true, value: email }
      : { ok: false, reason: "invalid" };
  }
  return { ok: true, value: text };
}

export type SplitResult = {
  responses: Record<string, number | string>;
  contact: Partial<Record<ContactField, string>>;
  /** Keys that are not part of this step, or have an invalid value. */
  invalid: string[];
};

/** Validates submitted values against the step's items and splits them by destination table. */
export function splitItems(
  specs: readonly ItemSpec[],
  values: ItemValues,
  mode: "draft" | "final",
): SplitResult {
  const byKey = new Map(specs.map((s) => [s.key, s]));
  const result: SplitResult = { responses: {}, contact: {}, invalid: [] };
  for (const [key, raw] of Object.entries(values)) {
    const spec = byKey.get(key);
    if (!spec) {
      result.invalid.push(key);
      continue;
    }
    const checked = checkItem(spec, raw, mode);
    if (!checked.ok) {
      // An empty value is simply not saved; an invalid one is rejected.
      if (checked.reason === "invalid") result.invalid.push(key);
      continue;
    }
    if (spec.type !== "choice" && spec.contact) result.contact[spec.contact] = String(checked.value);
    else result.responses[key] = checked.value;
  }
  return result;
}

/** Keys of required items that are missing or invalid (for Next). */
export function missingItems(specs: readonly ItemSpec[], values: ItemValues): string[] {
  return specs.filter((s) => !checkItem(s, values[s.key], "final").ok).map((s) => s.key);
}

/** "Lengkapi jawaban pertanyaan 1 dan alamat email terlebih dahulu." */
export function missingMessage(specs: readonly ItemSpec[], missing: readonly string[]): string {
  const names = specs.filter((s) => missing.includes(s.key)).map((s) => s.name);
  if (names.length === 0) return "";
  const list =
    names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} dan ${names[names.length - 1]}`;
  return `Lengkapi ${list} terlebih dahulu.`;
}
