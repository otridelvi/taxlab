/** How the audit log (A7) shows an entry (FSD-Admin §9). Pure: no database. */
import type { Json } from "@/lib/db/types";

export const AUDIT_ACTIONS = [
  "login",
  "generate",
  "change_cell",
  "deactivate",
  "reset_session",
  "update_target",
  "export_dataset",
  "export_events",
  "export_contacts",
  "delete_contacts",
] as const;

export type AuditActionName = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_LABELS: Record<AuditActionName, string> = {
  login: "Masuk",
  generate: "Generate kode",
  change_cell: "Ubah sel",
  deactivate: "Nonaktifkan kode",
  reset_session: "Reset sesi",
  update_target: "Ubah target",
  export_dataset: "Export dataset",
  export_events: "Export event log",
  export_contacts: "Export kontak",
  delete_contacts: "Hapus kontak",
};

/** Actions that change or expose sensitive data: shown with a red edge. */
export const SENSITIVE_ACTIONS: readonly string[] = ["reset_session", "export_contacts", "delete_contacts"];

export function isSensitiveAction(action: string): boolean {
  return SENSITIVE_ACTIONS.includes(action);
}

export function auditLabel(action: string): string {
  return (AUDIT_LABELS as Record<string, string>)[action] ?? action;
}

type Detail = Record<string, Json | undefined>;

const asDetail = (d: Json | null | undefined): Detail =>
  d && typeof d === "object" && !Array.isArray(d) ? (d as Detail) : {};
const str = (v: Json | undefined) => (typeof v === "string" || typeof v === "number" ? String(v) : null);

function filterText(v: Json | undefined): string | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const f = v as Detail;
  const parts: string[] = [];
  if (str(f.cell)) parts.push(`sel ${str(f.cell)}`);
  if (str(f.status)) parts.push(`status ${str(f.status)}`);
  if (str(f.batch)) parts.push("batch dipilih");
  if (str(f.from) || str(f.to)) parts.push(`${str(f.from) ?? "…"} s/d ${str(f.to) ?? "…"}`);
  return parts.length ? parts.join(", ") : "semua data";
}

/** One readable sentence per entry. Unknown actions fall back to the raw keys. */
export function describeAudit(action: string, detailJson: Json | null | undefined): string {
  const d = asDetail(detailJson);
  const reason = str(d.reason);
  switch (action) {
    case "login":
      return "Masuk ke panel admin.";
    case "generate": {
      const qty = str(d.quantity);
      const mode = d.mode === "manual" ? `manual (sel ${str(d.cell) ?? "?"})` : "acak berimbang";
      const label = str(d.label);
      return `Membuat ${qty ?? "?"} kode, mode ${mode}${label ? `, label “${label}”` : ""}.`;
    }
    case "change_cell":
      return `Sel ${str(d.from) ?? "?"} → ${str(d.to) ?? "?"}${reason ? `. Alasan: ${reason}` : ""}`;
    case "deactivate":
      return `Kode dinonaktifkan${reason ? `. Alasan: ${reason}` : ""}`;
    case "reset_session":
      return `Sesi direset (dari status ${str(d.from_status) ?? "?"}${str(d.from_page) ? `, halaman ${str(d.from_page)}` : ""}); ${str(d.responses) ?? 0} jawaban dan ${str(d.events) ?? 0} event diarsipkan${reason ? `. Alasan: ${reason}` : ""}`;
    case "update_target":
      return `Target per sel ${str(d.from) ?? "?"} → ${str(d.to) ?? "?"}.`;
    case "export_dataset":
    case "export_events":
    case "export_contacts": {
      const what = action === "export_dataset" ? "dataset" : action === "export_events" ? "event log" : "kontak insentif";
      const fmt = str(d.format);
      const f = filterText(d.filter);
      return `Mengunduh ${what}${fmt ? ` (${fmt.toUpperCase()})` : ""}, ${str(d.rows) ?? "?"} baris${f ? `; ${f}` : ""}.`;
    }
    case "delete_contacts":
      return d.scope === "batch"
        ? `Menghapus ${str(d.deleted) ?? 0} data kontak dari satu batch.`
        : `Menghapus ${str(d.deleted) ?? 0} data kontak (semua batch).`;
    default:
      return Object.keys(d).length ? JSON.stringify(d) : "—";
  }
}
