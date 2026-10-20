import { test } from "node:test";
import assert from "node:assert/strict";
import { FLOW_A, FLOW_B } from "../../content/flow";
import { mcQuestions, MC_QUESTIONS } from "../../content/questions";
import * as T from "../../content/text";
import { cellFactors } from "../../lib/cell";
import { mcKey } from "../../lib/answer-keys";
import { itemsForStep } from "../../lib/flow";

/** PLAN-10: Reviu Supervisor (Sel 1, 2) vs Catatan Supervisor (Sel 3, 4). */

const SELS = [1, 2, 3, 4] as const;

test("PR-1 the document follows the review factor only (Sel 1 = Sel 2, Sel 3 = Sel 4)", () => {
  assert.equal(cellFactors(1).review, cellFactors(2).review);
  assert.equal(cellFactors(3).review, cellFactors(4).review);
  assert.notEqual(cellFactors(1).review, cellFactors(3).review);
  assert.equal(T.SUPERVISOR_DOC[cellFactors(1).review].title, "Reviu Supervisor");
  assert.equal(T.SUPERVISOR_DOC[cellFactors(2).review].title, "Reviu Supervisor");
  assert.equal(T.SUPERVISOR_DOC[cellFactors(3).review].title, "Catatan Supervisor");
  assert.equal(T.SUPERVISOR_DOC[cellFactors(4).review].title, "Catatan Supervisor");
});

test("PR-2 Reviu has five points, Catatan has one bullet without e-mail or the checks", () => {
  const yes = T.SUPERVISOR_DOC.yes;
  const no = T.SUPERVISOR_DOC.no;
  assert.equal(yes.points.length, 5);
  assert.equal(yes.ordered, true);
  assert.deepEqual([...no.points], ["Lakukan pekerjaan secara seksama sesuai kode etik profesi."]);
  assert.equal(no.ordered, false);
  const note = JSON.stringify([no.body, no.points]);
  assert.doesNotMatch(note, /email|yurisprudensi|reviu/i);
  assert.match(JSON.stringify(yes.body), /membaca reviu ini/);
  assert.match(JSON.stringify(no.body), /membaca catatan ini/);
});

test("PR-3 the word follows the document everywhere it is named", () => {
  for (const r of ["yes", "no"] as const) {
    const doc = T.SUPERVISOR_DOC[r];
    const other = r === "yes" ? "catatan" : "reviu";
    assert.match(T.cases2Intro(r).join(" "), new RegExp(`${doc.noun} oleh supervisor`));
    assert.match(T.recIntro2(r), new RegExp(`${doc.noun} dari supervisor`));
    assert.match(doc.envelope.intro, new RegExp(doc.noun));
    assert.match(doc.envelope.button.toLowerCase(), new RegExp(doc.noun));
    assert.match(doc.foot.toLowerCase(), new RegExp(doc.noun));
    assert.equal(doc.label, doc.title);
    for (const text of [T.cases2Intro(r).join(" "), T.recIntro2(r), doc.envelope.intro, doc.envelope.button, doc.title, doc.refNo, doc.section]) {
      assert.doesNotMatch(text.toLowerCase(), new RegExp(other), `${r}: ${text}`);
    }
  }
});

test("PR-4 no placeholder text is left in the participant texts (Sel 2-4 no longer lorem ipsum)", () => {
  const shown = JSON.stringify([T.SUPERVISOR_DOC, T.MIN_EXPL, T.MIN_IMPL]);
  assert.doesNotMatch(shown, /lorem ipsum|menunggu materi|akuisisi/i);
  assert.match(JSON.stringify(T.MIN_EXPL), /rencana pengembangan usaha akan lebih mudah/);
});

test("PR-5 manipulation check legends name the document; options and admin view unchanged", () => {
  const yes = mcQuestions("yes");
  const no = mcQuestions("no");
  assert.match(yes[1].legend, /Dari Reviu atasan yang anda terima/);
  assert.match(no[1].legend, /Dari Catatan atasan yang anda terima/);
  assert.match(yes[2].legend, /Dari Reviu atasan yang diterima/);
  assert.match(no[2].legend, /Dari Catatan atasan yang diterima/);
  assert.deepEqual(yes.map((q) => q.options), no.map((q) => q.options));
  assert.equal(yes[0].legend, no[0].legend);
  assert.deepEqual(MC_QUESTIONS, yes);
  for (const flow of [FLOW_A, FLOW_B]) {
    const step = flow.find((s) => s.id === "mc_choice" || s.id === "questionnaire")!;
    const legends = (cell: number) =>
      itemsForStep(step, cellFactors(cell)).flatMap((i) => (i.type === "choice" ? [i.legend] : []));
    assert.ok(legends(1).some((l) => l.includes("Reviu atasan")));
    assert.ok(legends(2).some((l) => l.includes("Reviu atasan")));
    assert.ok(legends(3).some((l) => l.includes("Catatan atasan")));
    assert.ok(legends(4).some((l) => l.includes("Catatan atasan")));
    assert.ok(!legends(3).some((l) => l.includes("Reviu atasan")));
  }
});

test("PR-6 mc_q2 / mc_q3 keys are per review factor and still empty", () => {
  for (const cell of SELS) {
    const key = mcKey(cellFactors(cell));
    assert.equal(key.mc_q2, null);
    assert.equal(key.mc_q3, null);
  }
});
