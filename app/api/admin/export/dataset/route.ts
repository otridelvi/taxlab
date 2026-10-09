import { authorize } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { batchLabelOf, loadBundle } from "@/lib/db/export";
import { DATASET_COLS, buildDatasetRows } from "@/lib/export/build";
import { describeFilter, filterFromParams, filterToParams } from "@/lib/export/filter";
import { distinct, formatFrom, sendTable } from "@/lib/export/respond";

/** GET /api/admin/export/dataset?format=xlsx|csv&… : one row per participant (FSD-Admin §8.1). */
export async function GET(request: Request) {
  const admin = await authorize("export:dataset");
  if (admin instanceof Response) return admin;
  const params = new URL(request.url).searchParams;
  const format = formatFrom(params.get("format"), "xlsx");
  const filter = filterFromParams(params);
  filter.code = null;

  const bundle = await loadBundle(filter);
  const rows = buildDatasetRows(bundle);
  await writeAudit({
    adminId: admin.id,
    action: "export_dataset",
    detail: { format, filter: Object.fromEntries(filterToParams(filter)), rows: rows.length },
  });
  return sendTable({
    kind: "dataset",
    format,
    columns: DATASET_COLS,
    rows,
    sheetName: "dataset",
    adminName: admin.name,
    filterText: describeFilter(filter, await batchLabelOf(filter.batch)),
    extraInfo: [
      ["content_version", distinct(bundle.participants.map((p) => p.content_version))],
      ["flow_version", distinct(bundle.participants.map((p) => p.flow_version))],
    ],
  });
}
