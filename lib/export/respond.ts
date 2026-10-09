import "server-only";
import { serverEnv } from "@/lib/env";
import { exportFileName } from "@/lib/participants";
import { isoWib } from "@/lib/metrics";
import { CSV_TYPE, XLSX_TYPE, buildXlsx, downloadHeaders, rowsToCsv, type Row } from "./files";

export type ExportFormat = "csv" | "xlsx";

export function formatFrom(value: string | null, fallback: ExportFormat): ExportFormat {
  return value === "csv" || value === "xlsx" ? value : fallback;
}

/** The environment label, file name and the `info` sheet are shared by every export (D-3). */
export async function sendTable(args: {
  kind: "dataset" | "events" | "contacts" | "codebook";
  format: ExportFormat;
  columns: readonly string[];
  rows: readonly Row[];
  sheetName: string;
  adminName: string;
  filterText?: string;
  extraInfo?: ReadonlyArray<[string, string | number]>;
}): Promise<Response> {
  const env = serverEnv();
  const fileName = exportFileName(args.kind, args.format, env.APP_ENV);
  if (args.format === "csv") {
    return new Response(rowsToCsv(args.columns, args.rows), { headers: downloadHeaders(CSV_TYPE, fileName) });
  }
  const info: Array<[string, string | number]> = [
    ["environment", env.APP_ENV],
    ["type", args.kind],
    ["rows", args.rows.length],
    ["exported_at", isoWib(Date.now()) ?? ""],
    ["exported_by", args.adminName],
  ];
  if (args.filterText) info.push(["filter", args.filterText]);
  if (args.extraInfo) info.push(...args.extraInfo);
  const buffer = await buildXlsx([{ name: args.sheetName, columns: args.columns, rows: args.rows }], info);
  return new Response(buffer, { headers: downloadHeaders(XLSX_TYPE, fileName) });
}

/** "A, B" style list of the distinct non-empty values, for the info sheet. */
export const distinct = (values: Array<string | null | undefined>) =>
  [...new Set(values.filter((v): v is string => Boolean(v)))].sort().join(", ") || "—";
