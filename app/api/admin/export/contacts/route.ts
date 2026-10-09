import { ADMIN_MESSAGES } from "@/lib/admin-messages";
import { apiError, authorize, readJson } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { batchLabelOf, listExportParticipants, loadContacts } from "@/lib/db/export";
import { CONTACT_COLS, buildContactRows } from "@/lib/export/build";
import { contactsBodySchema, describeFilter, normalizeFilter, filterToParams } from "@/lib/export/filter";
import { sendTable } from "@/lib/export/respond";
import { EWALLETS } from "@/content/questions";

/**
 * POST /api/admin/export/contacts { filter, acknowledged: true } : incentive contacts (§8.3).
 * Admin only; no research answers in the file; always audited.
 */
export async function POST(request: Request) {
  const admin = await authorize("export:contacts");
  if (admin instanceof Response) return admin;
  const body = contactsBodySchema.safeParse(await readJson(request));
  if (!body.success) return apiError(400, "INVALID_INPUT", ADMIN_MESSAGES.invalidInput);
  if (body.data.acknowledged !== true) {
    return apiError(400, "NOT_ACKNOWLEDGED", "Centang pernyataan penggunaan data kontak terlebih dahulu.");
  }
  const filter = normalizeFilter(body.data.filter as Record<string, unknown> | undefined);
  filter.code = null;

  const participants = await listExportParticipants(filter);
  const contacts = await loadContacts(participants.map((p) => p.id));
  const labels = new Map<string, string>(EWALLETS.map((w) => [w.value, w.label]));
  const rows = buildContactRows(participants, contacts, (v) => labels.get(v) ?? v);

  await writeAudit({
    adminId: admin.id,
    action: "export_contacts",
    detail: { filter: Object.fromEntries(filterToParams(filter)), rows: rows.length },
  });
  return sendTable({
    kind: "contacts",
    format: "xlsx",
    columns: CONTACT_COLS,
    rows,
    sheetName: "contacts",
    adminName: admin.name,
    filterText: describeFilter(filter, await batchLabelOf(filter.batch)),
  });
}
