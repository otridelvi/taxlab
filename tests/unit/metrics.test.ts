import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTimeline, computeMetrics, spearman, type MetricEvent, type MetricParticipant } from "../../lib/metrics";
import { DATASET_COLUMNS, buildCodebook } from "../../lib/codebook";

/** PLAN-07: PA-1 … PA-7 (variable derivation and codebook). */

const T0 = Date.parse("2026-10-06T02:00:00.000Z"); // 09:00 WIB
const at = (sec: number) => new Date(T0 + sec * 1000).toISOString();

function ev(sec: number, type: string, target: string | null = null, round: number | null = null, extra: Partial<MetricEvent> = {}): MetricEvent {
  return { type, target, round, page_id: null, ts: at(sec), duration_ms: null, ...extra };
}

const base: MetricParticipant = {
  code: "TX-AAAA-BBBB",
  cell: 4,
  batch: "B1",
  status: "completed",
  content_version: "v1",
  flow_version: "A",
  consent_at: at(0),
  started_at: at(1),
  finished_at: at(1000),
  timed_out: false,
  timed_out_at_page: null,
};

const run = (events: MetricEvent[], responses: Record<string, unknown> = {}, p: Partial<MetricParticipant> = {}) =>
  computeMetrics({ participant: { ...base, ...p }, responses, events });

test("PA-1 case time excludes hidden tab (60 s open, 20 s hidden → 40 s)", () => {
  const { row } = run([
    ev(100, "round_start", "1", 1),
    ev(110, "case_open", "case03", 1),
    ev(120, "tab_hidden"),
    ev(140, "tab_visible"),
    ev(170, "case_close", "case03", 1),
    ev(300, "round_end", "1", 1),
  ]);
  assert.equal(row.case03_dur_s_r1, 40);
  assert.equal(row.case03_opened_r1, 1);
  assert.equal(row.case03_open_n_r1, 1);
  assert.equal(row.case03_dur_imputed_r1, 0);
  assert.equal(row.cases_opened_n_r1, 1);
  assert.equal(row.first_case_opened_r1, 3);
});

test("PA-2 missing case_close: closed at the next event, at most 10 minutes, imputed", () => {
  const next = run([ev(10, "case_open", "case01", 1), ev(50, "case_open", "case02", 1), ev(80, "case_close", "case02", 1)]).row;
  assert.equal(next.case01_dur_s_r1, 40);
  assert.equal(next.case01_dur_imputed_r1, 1);
  assert.equal(next.case02_dur_imputed_r1, 0);
  const lonely = run([ev(10, "case_open", "case05", 1)]).row;
  assert.equal(lonely.case05_dur_s_r1, 600);
  assert.equal(lonely.case05_dur_imputed_r1, 1);
  const late = run([ev(10, "case_open", "case05", 1), ev(5000, "page_leave", "cases_r1", 1)]).row;
  assert.equal(late.case05_dur_s_r1, 600);
});

test("PA-3 case still open at round end stops at round_end; round 2 gets nothing", () => {
  const { row } = run([
    ev(10, "round_start", "1", 1),
    ev(100, "case_open", "case07", 1),
    ev(160, "round_end", "1", 1),
    ev(200, "round_start", "2", 2),
  ]);
  assert.equal(row.case07_dur_s_r1, 60);
  assert.equal(row.case07_dur_imputed_r1, 1);
  assert.equal(row.case07_opened_r2, 0);
  assert.equal(row.case07_dur_s_r2, 0);
});

test("reference files are measured like cases and kept per round", () => {
  const { row } = run([
    ev(10, "ref_open", "facts", 1),
    ev(40, "ref_close", "facts", 1),
    ev(50, "ref_open", "facts", 1),
    ev(60, "ref_close", "facts", 1),
    ev(500, "ref_open", "review", 2),
    ev(530, "ref_close", "review", 2),
  ]);
  assert.equal(row.ref_facts_n_r1, 2);
  assert.equal(row.ref_facts_s_r1, 40);
  assert.equal(row.ref_review_n_r2, 1);
  assert.equal(row.ref_review_s_r2, 30);
  assert.equal(row.ref_memo_n_r1, 0);
  assert.ok(!("ref_review_n_r1" in row));
});

test("PA-4 rank changes: case 3 goes 1 → 5, spearman empty below 3 cases", () => {
  const two = run([], { rank_case03_r1: 1, rank_case03_r2: 5, rank_case04_r1: 2, rank_case04_r2: 2, save_case03_r1: 1, save_case03_r2: 0 }).row;
  assert.equal(two.rank_changed_n, 1);
  assert.equal(two.rank_abs_shift_sum, 4);
  assert.equal(two.rank_spearman, null);
  assert.equal(two.save_changed_n, 1);
  const three = run([], {
    rank_case01_r1: 1, rank_case01_r2: 3,
    rank_case02_r1: 2, rank_case02_r2: 2,
    rank_case03_r1: 3, rank_case03_r2: 1,
  }).row;
  assert.equal(three.rank_spearman, -1);
  assert.equal(spearman([1, 2, 3, 4], [1, 2, 3, 4]), 1);
  assert.equal(spearman([1, 1, 1], [1, 2, 3]), null);
});

test("round 1 → 2 recommendation and confidence deltas", () => {
  const { row } = run([], {
    rec_knowhow_r1: 100, rec_entertain_r1: 50, rec_repair_r1: 30, rec_marketing_r1: 20, confidence_r1: 60,
    rec_knowhow_r2: 80, rec_entertain_r2: 50, rec_repair_r2: 40, rec_marketing_r2: 20, confidence_r2: 75,
  });
  assert.equal(row.rec_total_r1, 200);
  assert.equal(row.rec_total_r2, 190);
  assert.equal(row.rec_knowhow_delta, -20);
  assert.equal(row.rec_repair_delta, 10);
  assert.equal(row.rec_total_delta, -10);
  assert.equal(row.confidence_delta, 15);
  assert.equal(run([], { rec_knowhow_r1: 1 }).row.rec_total_r1, null);
});

test("PA-5 flow B: memo read and gap; flow A leaves them empty and uses review_dur_s", () => {
  const events = [
    ev(100, "page_view", "memo"),
    ev(130, "doc_open", "memo"),
    ev(150, "tab_hidden"),
    ev(160, "tab_visible"),
    ev(250, "page_leave", "memo"),
    ev(400, "page_view", "review"),
    ev(405, "doc_open", "review"),
    ev(465, "page_leave", "review"),
  ];
  const b = run(events, {}, { flow_version: "B" }).row;
  assert.equal(b.memo_gap_s, 30);
  assert.equal(b.memo_read_s, 110);
  assert.equal(b.review_gap_s, 5);
  assert.equal(b.review_read_s, 60);
  assert.equal(b.review_dur_s, null);
  const a = run(events, {}, { flow_version: "A" }).row;
  assert.equal(a.memo_read_s, null);
  assert.equal(a.memo_gap_s, null);
  assert.equal(a.review_read_s, null);
  assert.equal(a.review_dur_s, 65);
});

test("PA-6 mc_pass follows the cell; cov_score is empty while the key is empty", () => {
  // Cell 4 = expl / strong → key mc_q1 = 1, mc_q2 = 2.
  const pass = run([], { mc_q1: 1, mc_q2: 2 }).row;
  assert.equal(pass.mc_pass_pref, 1);
  assert.equal(pass.mc_pass_acc, 1);
  const fail = run([], { mc_q1: 2, mc_q2: 1 }).row;
  assert.equal(fail.mc_pass_pref, 0);
  assert.equal(fail.mc_pass_acc, 0);
  // Cell 1 = impl / weak → mc_q1 = 2, mc_q2 = 1.
  const c1 = run([], { mc_q1: 2, mc_q2: 1 }, { cell: 1 }).row;
  assert.equal(c1.mc_pass_pref, 1);
  assert.equal(c1.mc_pass_acc, 1);
  assert.equal(run([]).row.mc_pass_pref, null);
  assert.equal(run([], { cov_q1: 1 }).row.cov_score, null);
});

test("section durations from round events and timestamps in WIB", () => {
  const { row } = run([
    ev(100, "round_start", "1", 1),
    ev(400, "round_end", "1", 1),
    ev(460, "round_start", "2", 2),
    ev(700, "round_end", "2", 2),
  ]);
  assert.equal(row.duration_total_s, 1000);
  assert.equal(row.duration_intro_s, 100);
  assert.equal(row.duration_r1_s, 300);
  assert.equal(row.duration_review_s, 60);
  assert.equal(row.duration_r2_s, 240);
  assert.equal(row.duration_quest_s, 300);
  assert.equal(row.consent_at, "2026-10-06T09:00:00.000+07:00");
  assert.equal(row.r1_start_at, "2026-10-06T09:01:40.000+07:00");
  assert.equal(run([], {}, { timed_out: true, timed_out_at_page: "cases_r2" }).row.timed_out, 1);
});

test("PA-7 dataset row keys equal the codebook order; no contact columns", () => {
  const { row } = run([]);
  assert.deepEqual(Object.keys(row), [...DATASET_COLUMNS]);
  const names = buildCodebook().map((v) => v.name);
  assert.equal(new Set(names).size, names.length, "duplicate variable names");
  assert.ok(!names.some((n) => /name|email|phone|ewallet/.test(n.replace(/^review_gap_s|^memo_gap_s/, ""))));
  assert.ok(buildCodebook().every((v) => v.description && v.group && v.source));
  assert.ok(names.includes("flow_version") && names.includes("memo_read_s") && names.includes("review_gap_s"));
});

test("timeline keeps the important events only", () => {
  const t = buildTimeline([
    ev(0, "consent"),
    ev(1, "session_start"),
    ev(5, "page_view", "facts_1"),
    ev(10, "page_view", "memo"),
    ev(20, "case_open", "case02", 1),
    ev(25, "case_close", "case02", 1),
    ev(30, "case_open", "case03", 1),
    ev(40, "tab_hidden"),
    ev(45, "tab_visible"),
    ev(60, "tab_hidden"),
    ev(90, "tab_visible"),
    ev(100, "session_finish"),
  ]);
  assert.deepEqual(
    t.map((e) => e.type),
    ["consent", "session_start", "page_view", "case_open", "tab_hidden", "session_finish"],
  );
  assert.match(t[4].label, /30 dtk/);
});
