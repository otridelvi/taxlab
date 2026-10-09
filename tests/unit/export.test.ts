import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import {
  CONTACT_COLS,
  DATASET_COLS,
  EVENT_COLS,
  buildCodebookRows,
  buildContactRows,
  buildDatasetRows,
  buildEventRows,
  type ExportBundle,
  type ExportParticipant,
} from "../../lib/export/build";
import { buildXlsx, rowsToCsv } from "../../lib/export/files";
import { DEFAULT_FILTER, dateBounds, filterFromParams, filterToParams, normalizeFilter } from "../../lib/export/filter";
import { exportFileName } from "../../lib/participants";

/** PLAN-07: PA-7 … PA-10 (export builders; the endpoints are covered by e2e). */

const participant = (over: Partial<ExportParticipant> = {}): ExportParticipant => ({
  id: "p1",
  code: "TX-AAAA-BBBB",
  cell: 3,
  batch: "Batch 1",
  status: "completed",
  content_version: "v1",
  flow_version: "B",
  consent_at: "2026-10-06T02:00:00.000Z",
  started_at: "2026-10-06T02:00:05.000Z",
  finished_at: "2026-10-06T02:30:00.000Z",
  timed_out: false,
  timed_out_at_page: null,
  ...over,
});

const bundle = (): ExportBundle => ({
  participants: [participant()],
  responses: new Map([["p1", { rank_case01_r1: 3, mc_q1: 2, contact_name: "tidak boleh muncul", semester: 5 }]]),
  events: new Map([
    [
      "p1",
      [
        { type: "case_open", target: "case01", round: 1, page_id: "cases_r1", ts: "2026-10-06T02:10:00.000Z", duration_ms: null, seq: 4, source: "client" },
        { type: "page_leave", target: "cases_r1", round: 1, page_id: "cases_r1", ts: "2026-10-06T02:11:00.000Z", duration_ms: null, seq: null, source: "server" },
      ],
    ],
  ]),
});

test("filter defaults to every cell and completed only; bad input falls back", () => {
  assert.deepEqual(DEFAULT_FILTER.cells, [1, 2, 3, 4]);
  assert.deepEqual(DEFAULT_FILTER.statuses, ["completed"]);
  const f = normalizeFilter({ cells: "2,9,x,2", statuses: "timed_out,bogus", batch: "nope", from: "2026-10-01", to: "10/10/2026", code: "tx-abcd-2345" });
  assert.deepEqual(f.cells, [2]);
  assert.deepEqual(f.statuses, ["timed_out"]);
  assert.equal(f.batch, null);
  assert.equal(f.from, "2026-10-01");
  assert.equal(f.to, null);
  assert.equal(f.code, "TX-ABCD-2345");
  assert.deepEqual(normalizeFilter(null), DEFAULT_FILTER);
});

test("filter survives a round trip through the query string; dates are WIB days", () => {
  const f = normalizeFilter({ cells: [1, 4], statuses: ["completed", "timed_out"], from: "2026-10-01", to: "2026-10-02" });
  assert.deepEqual(filterFromParams(filterToParams(f)), f);
  const { fromIso, toIso } = dateBounds(f);
  assert.equal(fromIso, "2026-09-30T17:00:00.000Z");
  assert.equal(toIso, "2026-10-02T17:00:00.000Z");
});

test("PA-8 file name has the SIT_ prefix only on SIT, and uses WIB", () => {
  const now = new Date("2026-10-06T02:05:00Z");
  assert.equal(exportFileName("dataset", "xlsx", "sit", now), "SIT_taxlab_dataset_2026-10-06_0905.xlsx");
  assert.equal(exportFileName("events", "csv", "production", now), "taxlab_events_2026-10-06_0905.csv");
});

test("CSV has a BOM, quotes commas/quotes/newlines and leaves missing values empty", () => {
  const csv = rowsToCsv(["a", "b", "c"], [{ a: 'x,"y"', b: null, c: 3 }, { a: "l1\nl2", b: 0 }]);
  assert.ok(csv.startsWith("﻿a,b,c\n"));
  assert.equal(csv.split("\n")[1], '"x,""y""",,3');
  assert.ok(csv.includes('"l1\nl2",0,'));
});

test("PA-7 dataset rows follow the codebook order and never hold contact data", () => {
  const rows = buildDatasetRows(bundle());
  assert.equal(rows.length, 1);
  assert.deepEqual(Object.keys(rows[0]), [...DATASET_COLS]);
  assert.equal(rows[0].code, "TX-AAAA-BBBB");
  assert.equal(rows[0].rank_case01_r1, 3);
  assert.equal(rows[0].flow_version, "B");
  assert.equal(rows[0].semester, 5);
  assert.ok(!JSON.stringify(rows).includes("tidak boleh muncul"));
  assert.equal(rows[0].case01_opened_r1, 1);
});

test("PA-10 event log: round filled for case events, times in +07:00", () => {
  const rows = buildEventRows(bundle());
  assert.deepEqual(Object.keys(rows[0]), [...EVENT_COLS]);
  assert.equal(rows[0].round, 1);
  assert.equal(rows[0].ts, "2026-10-06T09:10:00.000+07:00");
  assert.equal(rows[1].seq, null);
});

test("PA-9 contacts: only the allowed columns, e-wallet label, rows without data skipped", () => {
  const people = [participant(), participant({ id: "p2", code: "TX-CCCC-DDDD" })];
  const contacts = new Map([
    ["p1", { name: "Budi", email: "b@x.id", ewallet: "gopay", phone: "+6281234567890" }],
    ["p2", { name: null, email: null, ewallet: null, phone: null }],
  ]);
  const rows = buildContactRows(people, contacts, (v) => (v === "gopay" ? "GoPay" : v));
  assert.equal(rows.length, 1);
  assert.deepEqual(Object.keys(rows[0]), [...CONTACT_COLS]);
  assert.equal(rows[0].ewallet, "GoPay");
  assert.ok(!("rank_case01_r1" in rows[0]));
});

test("codebook rows have the seven documented columns", () => {
  const rows = buildCodebookRows();
  assert.deepEqual(Object.keys(rows[0]), ["variable", "group", "round", "description", "type", "values_unit", "source"]);
  assert.equal(rows.length, DATASET_COLS.length);
});

test("XLSX has the data sheet and an info sheet", async () => {
  const buf = await buildXlsx([{ name: "dataset", columns: ["code", "n"], rows: [{ code: "TX-1", n: 2 }] }], [["environment", "sit"]]);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  assert.deepEqual(wb.worksheets.map((w) => w.name), ["dataset", "info"]);
  assert.equal(wb.getWorksheet("dataset")?.getRow(2).getCell(1).value, "TX-1");
  assert.equal(wb.getWorksheet("info")?.getRow(1).getCell(2).value, "sit");
});
