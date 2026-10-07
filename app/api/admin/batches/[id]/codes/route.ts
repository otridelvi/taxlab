import ExcelJS from "exceljs";
import { z } from "zod";
import { ADMIN_MESSAGES } from "@/lib/admin-messages";
import { apiError, authorize } from "@/lib/api";
import { getBatchCodes } from "@/lib/db/participants";
import { serverEnv } from "@/lib/env";
import { codesToCsv, exportFileName, loginLink, type CodeRow } from "@/lib/participants";

/**
 * GET /api/admin/batches/{id}/codes?format=csv|xlsx
 * Columns: code, batch, login_link. Never the cell (G-08).
 */
export async function GET(request: Request, ctx: RouteContext<"/api/admin/batches/[id]/codes">) {
  const admin = await authorize("participants:generate");
  if (admin instanceof Response) return admin;

  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return apiError(404, "NOT_FOUND", ADMIN_MESSAGES.notFound);
  const format = new URL(request.url).searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

  const found = await getBatchCodes(id);
  if (!found) return apiError(404, "NOT_FOUND", ADMIN_MESSAGES.notFound);

  const env = serverEnv();
  const rows: CodeRow[] = found.codes.map((code) => ({
    code,
    batch: found.batch.label ?? "",
    loginLink: loginLink(env.APP_BASE_URL, code),
  }));
  const fileName = exportFileName("codes", format, env.APP_ENV);
  const disposition = `attachment; filename="${fileName}"`;

  if (format === "csv") {
    return new Response(codesToCsv(rows), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": disposition },
    });
  }

  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("codes");
  sheet.columns = [
    { header: "code", key: "code", width: 16 },
    { header: "batch", key: "batch", width: 32 },
    { header: "login_link", key: "loginLink", width: 60 },
  ];
  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };
  const info = wb.addWorksheet("info");
  info.addRows([
    ["environment", env.APP_ENV],
    ["batch", found.batch.label ?? ""],
    ["exported_at", new Date().toISOString()],
    ["exported_by", admin.name],
  ]);
  const buffer = await wb.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": disposition,
    },
  });
}
