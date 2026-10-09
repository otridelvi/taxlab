import { test } from "node:test";
import assert from "node:assert/strict";
import { AUDIT_ACTIONS, AUDIT_LABELS, auditLabel, describeAudit, isSensitiveAction } from "../../lib/audit-view";

test("PA-16: every action has a label; sensitive ones are marked", () => {
  for (const a of AUDIT_ACTIONS) assert.ok(AUDIT_LABELS[a].length > 0);
  assert.deepEqual(
    AUDIT_ACTIONS.filter(isSensitiveAction).sort(),
    ["delete_contacts", "export_contacts", "reset_session"],
  );
  assert.equal(isSensitiveAction("login"), false);
});

test("unknown action keeps its raw name", () => {
  assert.equal(auditLabel("something_new"), "something_new");
  assert.equal(describeAudit("something_new", { a: 1 }), '{"a":1}');
  assert.equal(describeAudit("something_new", {}), "—");
});

test("describe: generate, change cell, deactivate", () => {
  assert.equal(
    describeAudit("generate", { quantity: 20, mode: "manual", cell: 3, label: "Kelas A" }),
    "Membuat 20 kode, mode manual (sel 3), label “Kelas A”.",
  );
  assert.equal(describeAudit("generate", { quantity: 8, mode: "random" }), "Membuat 8 kode, mode acak berimbang.");
  assert.equal(describeAudit("change_cell", { from: 1, to: 4, reason: "tertukar" }), "Sel 1 → 4. Alasan: tertukar");
  assert.equal(describeAudit("deactivate", { reason: "hilang" }), "Kode dinonaktifkan. Alasan: hilang");
});

test("describe: reset session mentions what was archived", () => {
  const text = describeAudit("reset_session", {
    reason: "ponsel mati",
    from_status: "in_progress",
    from_page: "cases_r1",
    responses: 12,
    events: 80,
  });
  assert.match(text, /12 jawaban dan 80 event diarsipkan/);
  assert.match(text, /Alasan: ponsel mati/);
});

test("describe: target, exports, delete contacts", () => {
  assert.equal(describeAudit("update_target", { from: 30, to: 40 }), "Target per sel 30 → 40.");
  assert.equal(
    describeAudit("export_dataset", { format: "csv", rows: 7, filter: { status: "completed", cell: "1,2" } }),
    "Mengunduh dataset (CSV), 7 baris; sel 1,2, status completed.",
  );
  assert.equal(describeAudit("export_contacts", { rows: 3 }), "Mengunduh kontak insentif, 3 baris.");
  assert.equal(describeAudit("delete_contacts", { scope: "batch", deleted: 5 }), "Menghapus 5 data kontak dari satu batch.");
  assert.equal(describeAudit("delete_contacts", { scope: "all", deleted: 9 }), "Menghapus 9 data kontak (semua batch).");
});
