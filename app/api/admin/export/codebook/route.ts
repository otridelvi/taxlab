import { authorize } from "@/lib/api";
import { CODEBOOK_HEADERS, buildCodebookRows } from "@/lib/export/build";
import { sendTable } from "@/lib/export/respond";

/** GET /api/admin/export/codebook : variable definitions, always XLSX (§8.4). Not audited (no participant data). */
export async function GET() {
  const admin = await authorize("export:dataset");
  if (admin instanceof Response) return admin;
  return sendTable({
    kind: "codebook",
    format: "xlsx",
    columns: CODEBOOK_HEADERS,
    rows: buildCodebookRows(),
    sheetName: "codebook",
    adminName: admin.name,
  });
}
