import { z } from "zod";

/**
 * Items (answers) a step collects (FSD-Participant §8.1). The spec carries
 * both the validation rule and what the browser shows, so it can be passed
 * to the client form as-is.
 */
export type ContactField = "name" | "email" | "ewallet" | "phone";

/** Items of one group are counted together in messages: "peringkat (3 dari 14)". */
export type ItemGroup = { id: string; name: string };

export type ChoiceItem = {
  key: string;
  type: "choice";
  /** Question text (trusted HTML). */
  legend: string;
  /** Option labels (trusted HTML); stored value = 1-based index. */
  options: readonly string[];
  /** Short name used in "Lengkapi … terlebih dahulu." */
  name: string;
  /** Show a/b/c before the options (knowledge questions only). */
  letters?: boolean;
  /** Question number shown before the legend. */
  number?: number;
  required?: boolean;
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
  required?: boolean;
};

/** Whole number between min and max (rank, Rupiah, confidence). Stored as a JSON number. */
export type IntegerItem = {
  key: string;
  type: "integer";
  name: string;
  min: number;
  max: number;
  /** Shown by the form (e.g. the account name on the recommendation page). */
  label?: string;
  /** Items with the same `unique` id must hold different values (ranks within one round). */
  unique?: string;
  group?: ItemGroup;
  required?: boolean;
};

/** Yes (1) / No (0). */
export type BinaryItem = {
  key: string;
  type: "binary";
  name: string;
  group?: ItemGroup;
  required?: boolean;
};

export type ItemSpec = ChoiceItem | TextItem | IntegerItem | BinaryItem;
export type ItemValues = Record<string, unknown>;

/** Largest Rupiah amount accepted: 13 digits (below Number.MAX_SAFE_INTEGER). */
export const RUPIAH_MAX = 9_999_999_999_999;

/** Digits of `input` as a number, or null when there is none or it exceeds 13 digits. */
export function parseRupiah(input: string): number | null {
  const digits = input.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!digits || digits.length > 13) return null;
  return Number(digits);
}

/** 125000000 → "125.000.000" (locale independent). */
export function formatRupiah(n: number): string {
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

const emailSchema = z.email();

export function isRequired(spec: ItemSpec): boolean {
  return spec.required !== false;
}

function isEmptyRaw(raw: unknown): boolean {
  return raw === null || raw === undefined || raw === "";
}

/** A whole number from a JSON number or a string of digits; null when it is neither. */
function toInteger(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isSafeInteger(raw) ? raw : null;
  if (typeof raw === "string" && /^\d{1,15}$/.test(raw.trim())) return Number(raw.trim());
  return null;
}

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
    if (isEmptyRaw(raw)) return { ok: false, reason: "empty" };
    const n = typeof raw === "string" ? Number(raw) : raw;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > spec.options.length) {
      return { ok: false, reason: "invalid" };
    }
    return { ok: true, value: n };
  }
  if (spec.type === "integer") {
    if (isEmptyRaw(raw)) return { ok: false, reason: "empty" };
    const n = toInteger(raw);
    if (n === null || n < spec.min || n > spec.max) return { ok: false, reason: "invalid" };
    return { ok: true, value: n };
  }
  if (spec.type === "binary") {
    if (isEmptyRaw(raw)) return { ok: false, reason: "empty" };
    const n = toInteger(raw);
    if (n !== 0 && n !== 1) return { ok: false, reason: "invalid" };
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
  /**
   * Values to store. `null` = the participant cleared a rank/amount/answer: the stored
   * value becomes JSON null (empty), so a cleared answer never keeps its old value.
   */
  responses: Record<string, number | string | null>;
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
      if (checked.reason === "invalid") result.invalid.push(key);
      // An empty choice/number/yes-no was cleared by the participant: overwrite with null.
      else if (spec.type !== "text" && spec.type !== "email" && raw !== undefined)
        result.responses[key] = null;
      continue;
    }
    if ((spec.type === "text" || spec.type === "email") && spec.contact) {
      result.contact[spec.contact] = String(checked.value);
    } else {
      result.responses[key] = checked.value;
    }
  }
  return result;
}

/** Keys of required items that are missing or invalid (for Next). Optional items only count when filled wrongly. */
export function missingItems(specs: readonly ItemSpec[], values: ItemValues): string[] {
  return specs
    .filter((s) => {
      const checked = checkItem(s, values[s.key], "final");
      if (checked.ok) return false;
      return isRequired(s) || checked.reason === "invalid";
    })
    .map((s) => s.key);
}

/** Keys of integer items that share a value with another item of the same `unique` group. */
export function duplicateItems(specs: readonly ItemSpec[], values: ItemValues): string[] {
  const seen = new Map<string, string[]>(); // `${group}:${value}` → keys
  for (const s of specs) {
    if (s.type !== "integer" || !s.unique) continue;
    const checked = checkItem(s, values[s.key], "final");
    if (!checked.ok) continue;
    const id = `${s.unique}:${checked.value}`;
    seen.set(id, [...(seen.get(id) ?? []), s.key]);
  }
  return [...seen.values()].filter((keys) => keys.length > 1).flat();
}

export type StepProblems = { missing: string[]; duplicate: string[] };

/** Everything that stops Next on a step: missing/invalid items and repeated ranks. Same check in browser and server. */
export function stepProblems(specs: readonly ItemSpec[], values: ItemValues): StepProblems {
  return { missing: missingItems(specs, values), duplicate: duplicateItems(specs, values) };
}

export function hasProblems(p: StepProblems): boolean {
  return p.missing.length > 0 || p.duplicate.length > 0;
}

function groupOf(spec: ItemSpec): ItemGroup | undefined {
  return spec.type === "integer" || spec.type === "binary" ? spec.group : undefined;
}

/**
 * "Lengkapi jawaban pertanyaan 1 dan alamat email terlebih dahulu."
 * Grouped items are counted: "Lengkapi peringkat (12 dari 14) dan pilihan simpan (9 dari 14) terlebih dahulu."
 */
export function missingMessage(specs: readonly ItemSpec[], missing: readonly string[]): string {
  const names: string[] = [];
  const groups = new Set<string>();
  for (const s of specs) {
    if (!missing.includes(s.key)) continue;
    const g = groupOf(s);
    if (!g) {
      names.push(s.name);
      continue;
    }
    if (groups.has(g.id)) continue;
    groups.add(g.id);
    const total = specs.filter((x) => groupOf(x)?.id === g.id).length;
    const lacking = specs.filter((x) => groupOf(x)?.id === g.id && missing.includes(x.key)).length;
    names.push(`${g.name} (${total - lacking} dari ${total})`);
  }
  if (names.length === 0) return "";
  const list =
    names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} dan ${names[names.length - 1]}`;
  return `Lengkapi ${list} terlebih dahulu.`;
}

export const DUPLICATE_RANK_MESSAGE = "Setiap angka peringkat hanya boleh dipakai satu kali.";

/** One message for everything that stops Next. */
export function problemsMessage(specs: readonly ItemSpec[], problems: StepProblems): string {
  const parts = [missingMessage(specs, problems.missing)];
  if (problems.duplicate.length) parts.push(DUPLICATE_RANK_MESSAGE);
  return parts.filter(Boolean).join(" ");
}
