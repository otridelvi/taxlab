import ExcelJS from "exceljs";
import type { Cell } from "@/lib/metrics";

/** CSV / XLSX writers for the export files (FSD-Admin §8, PLAN-07 D-3). */

export type Row = Record<string, Cell | undefined>;

export const CSV_TYPE = "text/csv; charset=utf-8";
export const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function csvCell(value: Cell | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** UTF-8 with BOM, comma separated, \n line ends. */
export function rowsToCsv(columns: readonly string[], rows: readonly Row[]): string {
  const lines = [columns.map(csvCell).join(",")];
  for (const row of rows) lines.push(columns.map((c) => csvCell(row[c])).join(","));
  return "﻿" + lines.join("\n") + "\n";
}

export type SheetData = { name: string; columns: readonly string[]; rows: readonly Row[] };

/** Workbook with the data sheet(s) and an `info` sheet of label/value pairs. */
export async function buildXlsx(sheets: readonly SheetData[], info: ReadonlyArray<[string, string | number]>): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name);
    ws.columns = s.columns.map((c) => ({ header: c, key: c, width: Math.min(40, Math.max(10, c.length + 2)) }));
    for (const row of s.rows) ws.addRow(Object.fromEntries(s.columns.map((c) => [c, row[c] ?? null])));
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1, xSplit: 1 }];
  }
  const infoSheet = wb.addWorksheet("info");
  infoSheet.columns = [{ width: 22 }, { width: 90 }];
  infoSheet.addRows(info.map(([k, v]) => [k, v]));
  infoSheet.getColumn(1).font = { bold: true };
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

export function downloadHeaders(contentType: string, fileName: string): HeadersInit {
  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Cache-Control": "no-store",
  };
}
