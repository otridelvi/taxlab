import { test } from "node:test";
import assert from "node:assert/strict";
import {
  changeCellSchema,
  codesToCsv,
  createBatchSchema,
  exportFileName,
  filtersToQuery,
  loginLink,
  parseParticipantFilters,
} from "../../lib/participants";
import { positionLabel } from "../../lib/pages";

test("codes CSV has a BOM, the three columns and no cell column (G-08)", () => {
  const csv = codesToCsv([
    { code: "TX-7KQ2-M9PA", batch: 'Kelas "A", pagi', loginLink: "https://x/masuk?kode=TX-7KQ2-M9PA" },
  ]);
  assert.ok(csv.startsWith("﻿code,batch,login_link\n"));
  assert.ok(csv.includes('"Kelas ""A"", pagi"'));
  assert.equal(csv.toLowerCase().includes("cell"), false);
});

test("login link", () => {
  assert.equal(
    loginLink("https://taxlab-sit.vercel.app/", "TX-7KQ2-M9PA"),
    "https://taxlab-sit.vercel.app/masuk?kode=TX-7KQ2-M9PA",
  );
});

test("export file name uses WIB and the SIT prefix", () => {
  const at = new Date("2026-10-08T07:20:00Z"); // 14:20 WIB
  assert.equal(exportFileName("codes", "csv", "sit", at), "SIT_taxlab_codes_2026-10-08_1420.csv");
  assert.equal(exportFileName("codes", "xlsx", "production", at), "taxlab_codes_2026-10-08_1420.xlsx");
});

test("filters parse with safe defaults and round-trip to a query string", () => {
  const f = parseParticipantFilters({
    q: " 7kq2 ",
    cell: "4,2,9",
    status: "nope",
    size: "50",
    page: "3",
    sort: "code_asc",
  });
  assert.deepEqual(f.cells, [2, 4]);
  assert.equal(f.status, null);
  assert.equal(f.size, 50);
  assert.equal(f.page, 3);
  assert.equal(filtersToQuery(f), "?q=7kq2&cell=2%2C4&size=50&sort=code_asc&page=3");
  assert.equal(filtersToQuery(parseParticipantFilters({})), "");
});

test("request schemas", () => {
  assert.equal(createBatchSchema.safeParse({ quantity: 8, mode: "manual" }).success, false);
  assert.equal(createBatchSchema.safeParse({ quantity: 8, mode: "manual", cell: 4 }).success, true);
  assert.equal(createBatchSchema.safeParse({ quantity: 201, mode: "random" }).success, false);
  assert.equal(changeCellSchema.safeParse({ cell: 2, reason: "terlalu pendek" }).success, true);
  assert.equal(changeCellSchema.safeParse({ cell: 2, reason: "pendek" }).success, false);
});

test("position labels", () => {
  assert.equal(positionLabel("cases_r2"), "Putaran 2 · Daftar kasus");
  assert.equal(positionLabel("memo"), "Pembuka · Memo");
  assert.equal(positionLabel("review"), "Reviu Atasan");
  assert.equal(positionLabel(null), null);
});
