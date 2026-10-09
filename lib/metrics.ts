import { cellFactors } from "./cell";
import { COV_KEY, mcKey } from "./answer-keys";

/**
 * Derived variables of one participant (FSD-Admin §7.3–§7.5, PLAN-07 D-1). Pure functions: no
 * database, no clock. The same numbers feed the dataset export and the detail page (A5).
 *
 * Event timestamps are `events.client_ts` (server events carry the time of the database call).
 */

export const CASE_COUNT = 14;
export const MAX_IMPUTED_MS = 10 * 60 * 1000;
export const REF_DOCS = ["facts", "minutes", "memo", "review"] as const;
export type RefDocKey = (typeof REF_DOCS)[number];
export const REC_ACCOUNTS = ["knowhow", "entertain", "repair", "marketing"] as const;

export type Cell = string | number | null;
export type Round = 1 | 2;

export type MetricEvent = {
  type: string;
  target: string | null;
  round: number | null;
  page_id: string | null;
  ts: string;
  duration_ms: number | null;
  meta?: Record<string, unknown> | null;
};

export type MetricParticipant = {
  code: string;
  cell: number;
  batch: string | null;
  status: string;
  content_version: string | null;
  flow_version: "A" | "B" | null;
  consent_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  timed_out: boolean;
  timed_out_at_page: string | null;
};

export type MetricInput = {
  participant: MetricParticipant;
  responses: Record<string, unknown>;
  /** In database order (id ascending); events with the same timestamp keep this order. */
  events: MetricEvent[];
};

export const pad2 = (n: number) => String(n).padStart(2, "0");
export const caseId = (no: number) => `case${pad2(no)}`;

type Ev = MetricEvent & { ms: number };

const toMs = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const n = Date.parse(iso);
  return Number.isNaN(n) ? null : n;
};

const secs = (ms: number | null): number | null => (ms === null ? null : Math.round(ms / 1000));

/** ISO 8601 in WIB (+07:00), milliseconds kept: 2026-10-06T09:22:10.412+07:00. */
export function isoWib(value: string | number | null | undefined): string | null {
  const ms = typeof value === "number" ? value : toMs(value ?? null);
  if (ms === null) return null;
  return new Date(ms + 7 * 3600_000).toISOString().replace("Z", "+07:00");
}

type Interval = [number, number];

/** Periods the tab was hidden (tab_hidden → next tab_visible; open-ended when it never came back). */
function hiddenIntervals(events: Ev[]): Interval[] {
  const out: Interval[] = [];
  let from: number | null = null;
  for (const e of events) {
    if (e.type === "tab_hidden" && from === null) from = e.ms;
    else if (e.type === "tab_visible" && from !== null) {
      out.push([from, e.ms]);
      from = null;
    }
  }
  if (from !== null) out.push([from, Number.POSITIVE_INFINITY]);
  return out;
}

function overlapMs(start: number, end: number, hidden: Interval[]): number {
  let total = 0;
  for (const [a, b] of hidden) total += Math.max(0, Math.min(end, b) - Math.max(start, a));
  return total;
}

/** Duration of [start, end] without the hidden-tab time (never negative). */
function activeMs(start: number, end: number, hidden: Interval[]): number {
  return Math.max(0, end - start - overlapMs(start, end, hidden));
}

export type Span = {
  target: string;
  round: Round | null;
  startMs: number;
  endMs: number;
  /** Reading time: end − start − hidden tab. */
  activeMs: number;
  /** No matching close event: closed at the next boundary event, at most 10 minutes (§7.3). */
  imputed: boolean;
};

const CASE_BOUNDARY = new Set([
  "case_open",
  "case_close",
  "page_leave",
  "round_end",
  "timer_expired",
  "timer_stop",
  "session_finish",
]);
const REF_BOUNDARY = new Set([
  "ref_open",
  "ref_close",
  "page_leave",
  "round_end",
  "timer_expired",
  "timer_stop",
  "session_finish",
]);

function buildSpans(
  events: Ev[],
  hidden: Interval[],
  openType: string,
  closeType: string,
  boundary: Set<string>,
  roundEndMs: Partial<Record<Round, number>>,
): Span[] {
  const spans: Span[] = [];
  events.forEach((open, i) => {
    if (open.type !== openType || !open.target) return;
    const round = open.round === 1 || open.round === 2 ? open.round : null;
    let end: number | null = null;
    let imputed = true;
    for (let j = i + 1; j < events.length; j++) {
      const e = events[j];
      if (e.type === closeType && e.target === open.target) {
        end = e.ms;
        imputed = false;
        break;
      }
      if (boundary.has(e.type)) {
        end = e.ms;
        break;
      }
    }
    if (imputed) end = Math.min(end ?? Number.POSITIVE_INFINITY, open.ms + MAX_IMPUTED_MS);
    // A span never crosses the end of its round (T-18).
    const limit = round ? roundEndMs[round] : undefined;
    if (limit !== undefined && limit >= open.ms) end = Math.min(end as number, limit);
    const endMs = end as number;
    spans.push({
      target: open.target,
      round,
      startMs: open.ms,
      endMs,
      activeMs: activeMs(open.ms, endMs, hidden),
      imputed,
    });
  });
  return spans;
}

export type CaseStat = { opened: 0 | 1; openN: number; durMs: number; imputed: 0 | 1 };
export type RefStat = { openN: number; durMs: number };

export type Metrics = {
  /** One flat record per participant, keys in the same order as `lib/codebook.ts`. */
  row: Record<string, Cell>;
  detail: {
    cases: Record<Round, CaseStat[]>;
    refs: Record<Round, Record<RefDocKey, RefStat>>;
    sectionsMs: {
      total: number | null;
      intro: number | null;
      r1: number | null;
      review: number | null;
      r2: number | null;
      quest: number | null;
    };
  };
};

/** Rank positions with ties averaged (1-based). */
function ranksOf(values: number[]): number[] {
  const order = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const out = new Array<number>(values.length);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[order[k][1]] = avg;
    i = j + 1;
  }
  return out;
}

/** Spearman correlation of paired values; null with fewer than 3 pairs or no variation. */
export function spearman(a: number[], b: number[]): number | null {
  if (a.length < 3 || a.length !== b.length) return null;
  const ra = ranksOf(a);
  const rb = ranksOf(b);
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const ma = mean(ra);
  const mb = mean(rb);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < ra.length; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    da += (ra[i] - ma) ** 2;
    db += (rb[i] - mb) ** 2;
  }
  if (da === 0 || db === 0) return null;
  return Math.round((num / Math.sqrt(da * db)) * 10000) / 10000;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const diff = (a: number | null, b: number | null) => (a === null || b === null ? null : b - a);

export function computeMetrics(input: MetricInput): Metrics {
  const { participant: p, responses } = input;
  const events: Ev[] = input.events
    .map((e, i) => ({ e, i, ms: toMs(e.ts) }))
    .filter((x): x is { e: MetricEvent; i: number; ms: number } => x.ms !== null)
    .sort((a, b) => a.ms - b.ms || a.i - b.i)
    .map(({ e, ms }) => ({ ...e, ms }));
  const hidden = hiddenIntervals(events);

  const roundMs = (type: "round_start" | "round_end", round: Round): number | null =>
    events.find((e) => e.type === type && (e.round === round || e.target === String(round)))?.ms ?? null;
  const r1Start = roundMs("round_start", 1);
  const r1End = roundMs("round_end", 1);
  const r2Start = roundMs("round_start", 2);
  const r2End = roundMs("round_end", 2);
  const roundEndMs: Partial<Record<Round, number>> = {};
  if (r1End !== null) roundEndMs[1] = r1End;
  if (r2End !== null) roundEndMs[2] = r2End;

  const caseSpans = buildSpans(events, hidden, "case_open", "case_close", CASE_BOUNDARY, roundEndMs);
  const refSpans = buildSpans(events, hidden, "ref_open", "ref_close", REF_BOUNDARY, roundEndMs);

  const cases = { 1: [] as CaseStat[], 2: [] as CaseStat[] };
  const refs = {
    1: {} as Record<RefDocKey, RefStat>,
    2: {} as Record<RefDocKey, RefStat>,
  };
  const firstCase: Record<Round, number | null> = { 1: null, 2: null };
  for (const r of [1, 2] as const) {
    for (let no = 1; no <= CASE_COUNT; no++) {
      const mine = caseSpans.filter((s) => s.round === r && s.target === caseId(no));
      cases[r].push({
        opened: mine.length ? 1 : 0,
        openN: mine.length,
        durMs: mine.reduce((sum, s) => sum + s.activeMs, 0),
        imputed: mine.some((s) => s.imputed) ? 1 : 0,
      });
    }
    for (const doc of REF_DOCS) {
      const mine = refSpans.filter((s) => s.round === r && s.target === doc);
      refs[r][doc] = { openN: mine.length, durMs: mine.reduce((sum, s) => sum + s.activeMs, 0) };
    }
    const first = events.find((e) => e.type === "case_open" && e.round === r && e.target);
    const m = first?.target ? /^case(\d{2})$/.exec(first.target) : null;
    firstCase[r] = m ? Number(m[1]) : null;
  }

  // Page reading (review page, memo/review file in flow B).
  const pageView = (page: string) => events.find((e) => e.type === "page_view" && e.target === page)?.ms ?? null;
  const pageLeave = (page: string) => {
    const hits = events.filter((e) => e.type === "page_leave" && e.target === page);
    return hits.length ? hits[hits.length - 1].ms : null;
  };
  const docOpen = (doc: "memo" | "review") => events.find((e) => e.type === "doc_open" && e.target === doc)?.ms ?? null;
  const readFrom = (start: number | null, end: number | null): number | null =>
    start === null || end === null || end < start ? null : activeMs(start, end, hidden);
  const gapFrom = (view: number | null, open: number | null): number | null =>
    view === null || open === null ? null : Math.max(0, open - view);

  const flowB = p.flow_version === "B";
  const reviewDur = flowB ? null : readFrom(pageView("review"), pageLeave("review"));
  const memoRead = flowB ? readFrom(docOpen("memo"), pageLeave("memo")) : null;
  const memoGap = flowB ? gapFrom(pageView("memo"), docOpen("memo")) : null;
  const reviewRead = flowB ? readFrom(docOpen("review"), pageLeave("review")) : null;
  const reviewGap = flowB ? gapFrom(pageView("review"), docOpen("review")) : null;

  // Session sections (§8.1 "Waktu").
  const consentMs = toMs(p.consent_at);
  const finishedMs = toMs(p.finished_at);
  const sectionsMs = {
    total: consentMs !== null && finishedMs !== null ? Math.max(0, finishedMs - consentMs) : null,
    intro: consentMs !== null && r1Start !== null ? Math.max(0, r1Start - consentMs) : null,
    r1: r1Start !== null && r1End !== null ? Math.max(0, r1End - r1Start) : null,
    review: r1End !== null && r2Start !== null ? Math.max(0, r2Start - r1End) : null,
    r2: r2Start !== null && r2End !== null ? Math.max(0, r2End - r2Start) : null,
    quest: r2End !== null && finishedMs !== null ? Math.max(0, finishedMs - r2End) : null,
  };

  const resp = (key: string): number | null => num(responses[key]);
  const row: Record<string, Cell> = {};

  // Identity
  const f = cellFactors(p.cell);
  row.code = p.code;
  row.cell = p.cell;
  row.pref = f.pref;
  row.acc = f.acc;
  row.batch = p.batch;
  row.status = p.status;
  row.content_version = p.content_version;
  row.flow_version = p.flow_version;

  // Time
  row.consent_at = isoWib(p.consent_at);
  row.started_at = isoWib(p.started_at);
  row.r1_start_at = isoWib(r1Start);
  row.r1_end_at = isoWib(r1End);
  row.review_end_at = isoWib(r2Start);
  row.r2_end_at = isoWib(r2End);
  row.finished_at = isoWib(p.finished_at);
  row.duration_total_s = secs(sectionsMs.total);
  row.duration_intro_s = secs(sectionsMs.intro);
  row.duration_r1_s = secs(sectionsMs.r1);
  row.duration_review_s = secs(sectionsMs.review);
  row.duration_r2_s = secs(sectionsMs.r2);
  row.duration_quest_s = secs(sectionsMs.quest);
  row.timed_out = p.timed_out ? 1 : 0;
  row.timed_out_at_page = p.timed_out_at_page;

  // Berita Acara
  row.ba_q1 = resp("ba_q1");
  row.ba_q2 = resp("ba_q2");

  const roundBlock = (r: Round) => {
    const s = `_r${r}`;
    const stats = cases[r];
    for (let no = 1; no <= CASE_COUNT; no++) {
      const c = stats[no - 1];
      row[`case${pad2(no)}_opened${s}`] = c.opened;
      row[`case${pad2(no)}_open_n${s}`] = c.openN;
      row[`case${pad2(no)}_dur_s${s}`] = secs(c.durMs);
      row[`case${pad2(no)}_dur_imputed${s}`] = c.imputed;
    }
    row[`cases_opened_n${s}`] = stats.filter((c) => c.opened).length;
    row[`cases_dur_total_s${s}`] = secs(stats.reduce((sum, c) => sum + c.durMs, 0));
    row[`first_case_opened${s}`] = firstCase[r];
    for (const doc of REF_DOCS) {
      if (doc === "review" && r === 1) continue;
      row[`ref_${doc}_n${s}`] = refs[r][doc].openN;
      row[`ref_${doc}_s${s}`] = secs(refs[r][doc].durMs);
    }
    for (let no = 1; no <= CASE_COUNT; no++) {
      row[`rank_case${pad2(no)}${s}`] = resp(`rank_case${pad2(no)}${s}`);
      row[`save_case${pad2(no)}${s}`] = resp(`save_case${pad2(no)}${s}`);
    }
  };
  const recBlock = (r: Round) => {
    const s = `_r${r}`;
    let total: number | null = 0;
    for (const a of REC_ACCOUNTS) {
      const v = resp(`rec_${a}${s}`);
      row[`rec_${a}${s}`] = v;
      total = total === null || v === null ? null : total + v;
    }
    row[`rec_total${s}`] = total;
    row[`confidence${s}`] = resp(`confidence${s}`);
  };

  roundBlock(1);
  for (let i = 1; i <= 5; i++) row[`cov_q${i}`] = resp(`cov_q${i}`);
  row.cov_score = covScore(responses);
  recBlock(1);

  row.review_dur_s = secs(reviewDur);
  row.memo_read_s = secs(memoRead);
  row.memo_gap_s = secs(memoGap);
  row.review_read_s = secs(reviewRead);
  row.review_gap_s = secs(reviewGap);

  roundBlock(2);
  recBlock(2);

  // Change round 1 → 2 (§7.5)
  for (const a of REC_ACCOUNTS) row[`rec_${a}_delta`] = diff(num(row[`rec_${a}_r1`]), num(row[`rec_${a}_r2`]));
  row.rec_total_delta = diff(num(row.rec_total_r1), num(row.rec_total_r2));
  row.confidence_delta = diff(num(row.confidence_r1), num(row.confidence_r2));
  const paired: Array<[number, number]> = [];
  let saveChanged = 0;
  for (let no = 1; no <= CASE_COUNT; no++) {
    const a = num(row[`rank_case${pad2(no)}_r1`]);
    const b = num(row[`rank_case${pad2(no)}_r2`]);
    if (a !== null && b !== null) paired.push([a, b]);
    const sa = num(row[`save_case${pad2(no)}_r1`]);
    const sb = num(row[`save_case${pad2(no)}_r2`]);
    if (sa !== null && sb !== null && sa !== sb) saveChanged++;
  }
  row.rank_changed_n = paired.filter(([a, b]) => a !== b).length;
  row.rank_abs_shift_sum = paired.reduce((sum, [a, b]) => sum + Math.abs(b - a), 0);
  row.rank_spearman = spearman(
    paired.map(([a]) => a),
    paired.map(([, b]) => b),
  );
  row.save_changed_n = saveChanged;
  row.cases_opened_delta = diff(num(row.cases_opened_n_r1), num(row.cases_opened_n_r2));

  // Manipulation checks
  for (let i = 1; i <= 3; i++) row[`mc_q${i}`] = resp(`mc_q${i}`);
  for (let i = 1; i <= 4; i++) row[`mc_likert${i}`] = resp(`mc_likert${i}`);
  const key = mcKey(f);
  const q1 = resp("mc_q1");
  const q2 = resp("mc_q2");
  row.mc_pass_pref = q1 === null ? null : q1 === key.mc_q1 ? 1 : 0;
  row.mc_pass_acc = q2 === null ? null : q2 === key.mc_q2 ? 1 : 0;

  // Demographics
  row.semester = resp("semester");
  row.gender = resp("gender");
  row.age = resp("age");
  row.education = resp("education");

  return { row, detail: { cases, refs, sectionsMs } };
}

/** Number of knowledge answers equal to the key; null until the researcher supplies it (C1). */
export function covScore(responses: Record<string, unknown>): number | null {
  if (!COV_KEY) return null;
  let score = 0;
  for (const [k, correct] of Object.entries(COV_KEY)) if (num(responses[k]) === correct) score++;
  return score;
}

// ---------------------------------------------------------------------------------------------
// Timeline (A5, DT-07)
// ---------------------------------------------------------------------------------------------

export type TimelineEntry = { ms: number; ts: string; type: string; label: string; round: number | null };

const TIMELINE_TYPES = new Set([
  "consent",
  "session_start",
  "round_start",
  "round_end",
  "ref_open",
  "timer_warning",
  "timer_expired",
  "session_resume",
  "session_finish",
]);
const VARIANT_PAGES = new Set(["minutes", "memo", "review"]);
const PAGE_LABEL_MIN_HIDDEN_MS = 10_000;

/** Important events only (not the whole log): see FSD-Admin §6.5 DT-07. */
export function buildTimeline(rawEvents: MetricEvent[]): TimelineEntry[] {
  const events: Ev[] = rawEvents
    .map((e, i) => ({ e, i, ms: toMs(e.ts) }))
    .filter((x): x is { e: MetricEvent; i: number; ms: number } => x.ms !== null)
    .sort((a, b) => a.ms - b.ms || a.i - b.i)
    .map(({ e, ms }) => ({ ...e, ms }));
  const out: TimelineEntry[] = [];
  const seenFirstCase = new Set<number>();
  const add = (e: Ev, label: string) => out.push({ ms: e.ms, ts: e.ts, type: e.type, label, round: e.round });
  let hiddenFrom: Ev | null = null;
  for (const e of events) {
    if (e.type === "tab_hidden") hiddenFrom = e;
    else if (e.type === "tab_visible" && hiddenFrom) {
      const gap = e.ms - hiddenFrom.ms;
      if (gap > PAGE_LABEL_MIN_HIDDEN_MS) add(hiddenFrom, `Tab tersembunyi ${Math.round(gap / 1000)} dtk`);
      hiddenFrom = null;
    } else if (e.type === "page_view" && e.target && VARIANT_PAGES.has(e.target)) {
      add(e, `Membuka halaman ${e.target}`);
    } else if (e.type === "case_open" && (e.round === 1 || e.round === 2) && !seenFirstCase.has(e.round)) {
      seenFirstCase.add(e.round);
      add(e, `Kasus pertama dibuka (putaran ${e.round}): ${e.target ?? ""}`.trim());
    } else if (TIMELINE_TYPES.has(e.type)) {
      add(e, timelineLabel(e));
    }
  }
  return out;
}

function timelineLabel(e: Ev): string {
  switch (e.type) {
    case "consent":
      return "Persetujuan";
    case "session_start":
      return "Sesi dimulai";
    case "round_start":
      return `Putaran ${e.round ?? e.target ?? ""} dimulai`.trim();
    case "round_end":
      return `Putaran ${e.round ?? e.target ?? ""} selesai`.trim();
    case "ref_open":
      return `Berkas dibuka: ${e.target ?? ""}`.trim();
    case "timer_warning":
      return "Peringatan sisa waktu";
    case "timer_expired":
      return "Waktu habis";
    case "session_resume":
      return "Sesi dilanjutkan";
    case "session_finish":
      return "Sesi selesai";
    default:
      return e.type;
  }
}
