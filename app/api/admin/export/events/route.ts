import { authorize } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { batchLabelOf, loadBundle } from "@/lib/db/export";
import { EVENT_COLS, buildEventRows } from "@/lib/export/build";
import { describeFilter, filterFromParams, filterToParams } from "@/lib/export/filter";
import { distinct, formatFrom, sendTable } from "@/lib/export/respond";

/** GET /api/admin/export/events?format=csv|xlsx&… (+ code for one participant): long format (§8.2). */
export async function GET(request: Request) {
  const admin = await authorize("export:dataset");
  if (admin instanceof Response) return admin;
  const params = new URL(request.url).searchParams;
  const format = formatFrom(params.get("format"), "csv");
  const filter = filterFromParams(params);
  // One participant by code: any status, so the detail page link works for unfinished sessions too.
  if (filter.code) {
    filter.statuses = ["not_started", "in_progress", "completed", "timed_out", "cancelled"];
    filter.cells = [1, 2, 3, 4];
  }

  const bundle = await loadBundle(filter);
  const rows = buildEventRows(bundle);
  await writeAudit({
    adminId: admin.id,
    action: "export_events",
    detail: { format, filter: Object.fromEntries(filterToParams(filter)), rows: rows.length },
  });
  return sendTable({
    kind: "events",
    format,
    columns: EVENT_COLS,
    rows,
    sheetName: "events",
    adminName: admin.name,
    filterText: describeFilter(filter, await batchLabelOf(filter.batch)),
    extraInfo: [["flow_version", distinct(bundle.participants.map((p) => p.flow_version))]],
  });
}
