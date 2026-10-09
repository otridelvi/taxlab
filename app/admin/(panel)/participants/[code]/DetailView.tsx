import Link from "next/link";
import shell from "@/components/admin/admin.module.css";
import { StatusLabel } from "@/components/admin/StatusLabel";
import ui from "@/components/admin/ui.module.css";
import cases from "@/content/cases.json";
import { EDUCATION, GENDER, LIKERT_LABELS, LIKERT_STATEMENTS, MC_QUESTIONS } from "@/content/questions";
import { COSTS_DRAFT, COV, MINUTES_QUESTIONS, REC_LABELS } from "@/content/text";
import { COV_KEY } from "@/lib/answer-keys";
import { CELL_LABELS } from "@/lib/dashboard";
import type { ExportParticipant } from "@/lib/export/build";
import { EMPTY, arrowDelta, dateTimeWib, durationText, rankShift, rupiah, rupiahDelta } from "@/lib/format";
import { positionLabel } from "@/lib/pages";
import { CASE_COUNT, REC_ACCOUNTS, pad2, type Metrics, type TimelineEntry } from "@/lib/metrics";
import { ParticipantActions } from "../ParticipantActions";
import styles from "./detail.module.css";

type Props = {
  participant: ExportParticipant;
  position: string | null;
  metrics: Metrics;
  responses: Record<string, unknown>;
  timeline: TimelineEntry[];
  eventCount: number;
  canExport: boolean;
  canChangeCell: boolean;
  canDeactivate: boolean;
};

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const strip = (s: string) => s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const secOf = (ms: number | null) => (ms === null ? null : Math.round(ms / 1000));
const cell = (v: unknown) => (v === null || v === undefined ? EMPTY : String(v));

/** "2 · Manajemen klien …" or "—". */
function choice(value: unknown, options: readonly string[]): string {
  const n = num(value);
  if (n === null) return EMPTY;
  return `${n} · ${options[n - 1] ? strip(options[n - 1]) : "(di luar opsi)"}`;
}

const TIME_FMT = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Jakarta",
});

export function DetailView(props: Props) {
  const { participant: p, metrics, responses } = props;
  const row = metrics.row;
  const d = metrics.detail;
  const pos = p.status === "in_progress" || p.status === "timed_out" ? positionLabel(props.position) : null;
  const flowB = p.flow_version === "B";
  const status = p.status as Parameters<typeof StatusLabel>[0]["status"];

  const maxDur = Math.max(1, ...d.cases[1].map((c) => c.durMs), ...d.cases[2].map((c) => c.durMs));
  const anyImputed = [1, 2].some((r) => d.cases[r as 1 | 2].some((c) => c.imputed));
  const sec = d.sectionsMs;
  const draft = COSTS_DRAFT.map(([, v]) => Number(v.replace(/\D/g, "")));
  const draftTotal = draft.reduce((a, b) => a + b, 0);

  const mcPass = [row.mc_pass_pref, row.mc_pass_acc].map(num);
  const mcText = mcPass.some((v) => v === null) ? EMPTY : `${mcPass.reduce<number>((a, b) => a + (b ?? 0), 0)}/2`;

  const recRows = [
    ...REC_ACCOUNTS.map((a, i) => ({
      label: REC_LABELS[i][1],
      draft: draft[i],
      r1: num(row[`rec_${a}_r1`]),
      r2: num(row[`rec_${a}_r2`]),
      total: false,
    })),
    { label: "Total", draft: draftTotal, r1: num(row.rec_total_r1), r2: num(row.rec_total_r2), total: true },
  ];

  return (
    <>
      <p className={styles.back}>
        <Link href="/admin/participants">← Daftar partisipan</Link>
      </p>

      <section className={shell.card} aria-label="Ringkasan partisipan">
        <div className={styles.head}>
          <div>
            <h1 className={styles.code}>{p.code}</h1>
            <dl className={styles.meta}>
              <div className={styles.metaItem}>
                <dt>Status</dt>
                <dd>
                  <StatusLabel status={status} />
                  {pos ? <span className={ui.position}>{pos}</span> : null}
                </dd>
              </div>
              <div className={styles.metaItem}>
                <dt>Sel</dt>
                <dd>
                  {p.cell} · {CELL_LABELS[p.cell]}
                </dd>
              </div>
              <div className={styles.metaItem}>
                <dt>Batch</dt>
                <dd>{p.batch ?? EMPTY}</dd>
              </div>
              <div className={styles.metaItem}>
                <dt>Mulai</dt>
                <dd>{dateTimeWib(p.started_at)}</dd>
              </div>
              <div className={styles.metaItem}>
                <dt>Selesai</dt>
                <dd>{dateTimeWib(p.finished_at)}</dd>
              </div>
              <div className={styles.metaItem}>
                <dt>Versi konten</dt>
                <dd>{p.content_version ?? EMPTY}</dd>
              </div>
              <div className={styles.metaItem}>
                <dt>Alur</dt>
                <dd>{p.flow_version ?? EMPTY}</dd>
              </div>
            </dl>
          </div>
          <div className={styles.headActions}>
            {props.canExport ? (
              <a className={ui.buttonSecondary} href={`/api/admin/export/events?format=csv&code=${p.code}`}>
                Unduh event log ({props.eventCount})
              </a>
            ) : null}
            {p.status === "not_started" ? (
              <ParticipantActions
                id={p.id}
                code={p.code}
                cell={p.cell}
                canChangeCell={props.canChangeCell}
                canDeactivate={props.canDeactivate}
              />
            ) : null}
          </div>
        </div>
      </section>

      <div className={styles.summary}>
        <article className={styles.stat}>
          <h3>Durasi</h3>
          <div className={styles.statValue}>{durationText(secOf(sec.total))}</div>
          <ul className={styles.parts}>
            <li><span>Pembuka</span><span>{durationText(secOf(sec.intro))}</span></li>
            <li><span>Putaran 1</span><span>{durationText(secOf(sec.r1))}</span></li>
            <li><span>Reviu</span><span>{durationText(secOf(sec.review))}</span></li>
            <li><span>Putaran 2</span><span>{durationText(secOf(sec.r2))}</span></li>
            <li><span>Kuesioner</span><span>{durationText(secOf(sec.quest))}</span></li>
          </ul>
        </article>
        <article className={styles.stat}>
          <h3>Kasus dibuka</h3>
          <div className={styles.statValue}>
            r1 {cell(row.cases_opened_n_r1)}/{CASE_COUNT} · r2 {cell(row.cases_opened_n_r2)}/{CASE_COUNT}
          </div>
          <div className={styles.statSub}>
            Dibuka {d.cases[1].reduce((a, c) => a + c.openN, 0)}× di putaran 1, {d.cases[2].reduce((a, c) => a + c.openN, 0)}× di putaran 2
          </div>
        </article>
        <article className={styles.stat}>
          <h3>Waktu baca kasus</h3>
          <div className={styles.statValue}>
            {durationText(num(row.cases_dur_total_s_r1))} · {durationText(num(row.cases_dur_total_s_r2))}
          </div>
          <div className={styles.statSub}>Putaran 1 · putaran 2 (tanpa tab tersembunyi)</div>
        </article>
        <article className={styles.stat}>
          <h3>Keyakinan</h3>
          <div className={styles.statValue}>
            {cell(row.confidence_r1)} → {cell(row.confidence_r2)}
          </div>
          <div className={styles.statSub}>{arrowDelta(num(row.confidence_delta))}</div>
        </article>
        <article className={styles.stat}>
          <h3>Peringkat berubah</h3>
          <div className={styles.statValue}>
            {cell(row.rank_changed_n)} dari {CASE_COUNT}
          </div>
          <div className={styles.statSub}>Spearman {row.rank_spearman === null ? EMPTY : String(row.rank_spearman)}</div>
        </article>
        <article className={styles.stat}>
          <h3>Cek manipulasi</h3>
          <div className={styles.statValue}>{mcText}</div>
          <div className={styles.statSub}>
            Preferensi {cell(row.mc_pass_pref)} · akuntabilitas {cell(row.mc_pass_acc)}
          </div>
        </article>
      </div>

      <section className={shell.card} aria-labelledby="d-rec">
        <div className={ui.cardHead}>
          <h2 id="d-rec">Rekomendasi</h2>
          <span>Dibandingkan dengan draft klien</span>
        </div>
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th scope="col">Akun</th>
                <th scope="col" className={ui.num}>Draft klien</th>
                <th scope="col" className={ui.num}>Rekomendasi 1</th>
                <th scope="col" className={ui.num}>Rekomendasi 2</th>
                <th scope="col" className={ui.num}>R1 − draft</th>
                <th scope="col" className={ui.num}>R2 − draft</th>
                <th scope="col" className={ui.num}>R2 − R1</th>
              </tr>
            </thead>
            <tbody>
              {recRows.map((r) => (
                <tr key={r.label}>
                  <th scope="row" style={r.total ? { fontWeight: 700 } : undefined}>{r.label}</th>
                  <td className={ui.num}>{rupiah(r.draft)}</td>
                  <td className={ui.num}>{rupiah(r.r1)}</td>
                  <td className={ui.num}>{rupiah(r.r2)}</td>
                  <td className={ui.num}>{r.r1 === null ? EMPTY : rupiahDelta(r.r1 - r.draft)}</td>
                  <td className={ui.num}>{r.r2 === null ? EMPTY : rupiahDelta(r.r2 - r.draft)}</td>
                  <td className={ui.num}>{r.r1 === null || r.r2 === null ? EMPTY : rupiahDelta(r.r2 - r.r1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={shell.card} aria-labelledby="d-cases">
        <div className={ui.cardHead}>
          <h2 id="d-cases">14 kasus acuan</h2>
          <span>Putaran 1 dan 2 berdampingan</span>
        </div>
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th scope="col" rowSpan={2}>No · Kasus</th>
                <th scope="colgroup" colSpan={4} className={styles.groupHead}>Putaran 1</th>
                <th scope="colgroup" colSpan={4} className={styles.groupHead}>Putaran 2</th>
                <th scope="colgroup" colSpan={2} className={styles.groupHead}>Perubahan</th>
              </tr>
              <tr>
                {[1, 2].map((r) => (
                  <RoundHeads key={r} />
                ))}
                <th scope="col" className={`${ui.num} ${styles.sep}`}>Peringkat</th>
                <th scope="col">Simpan</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => {
                const no = c.no;
                const a = d.cases[1][no - 1];
                const b = d.cases[2][no - 1];
                const rk1 = num(row[`rank_case${pad2(no)}_r1`]);
                const rk2 = num(row[`rank_case${pad2(no)}_r2`]);
                const sv1 = num(row[`save_case${pad2(no)}_r1`]);
                const sv2 = num(row[`save_case${pad2(no)}_r2`]);
                const yn = (v: number | null) => (v === null ? EMPTY : v === 1 ? "Ya" : "Tidak");
                const saveChange = sv1 === null || sv2 === null ? EMPTY : sv1 === sv2 ? "=" : `${yn(sv1)} → ${yn(sv2)}`;
                return (
                  <tr key={no}>
                    <th scope="row">{no} · {c.name}</th>
                    <CaseCells stat={a} rank={rk1} save={yn(sv1)} maxDur={maxDur} />
                    <CaseCells stat={b} rank={rk2} save={yn(sv2)} maxDur={maxDur} />
                    <td className={`${ui.num} ${styles.sep}`}>{rankShift(rk1, rk2)}</td>
                    <td>{saveChange}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className={styles.foot}>
          Panjang bar dibandingkan di kedua putaran. Durasi di luar tab tersembunyi.
          {anyImputed ? " * = durasi diperkirakan karena penutupan kasus tidak tercatat (maks. 10 menit)." : ""}
        </p>
      </section>

      <section className={shell.card} aria-labelledby="d-refs">
        <div className={ui.cardHead}>
          <h2 id="d-refs">Berkas penugasan</h2>
          <span>Jumlah dibuka dan total waktu dari menu Berkas</span>
        </div>
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th scope="col">Berkas</th>
                <th scope="col" className={ui.num}>Putaran 1 · dibuka</th>
                <th scope="col" className={ui.num}>Putaran 1 · waktu</th>
                <th scope="col" className={ui.num}>Putaran 2 · dibuka</th>
                <th scope="col" className={ui.num}>Putaran 2 · waktu</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["facts", "Fakta Klien"],
                  ["minutes", "Berita Acara"],
                  ["memo", "Memo"],
                  ["review", "Reviu Atasan"],
                ] as const
              ).map(([k, label]) => (
                <tr key={k}>
                  <th scope="row">{label}</th>
                  <td className={ui.num}>{k === "review" ? EMPTY : d.refs[1][k].openN}</td>
                  <td className={ui.num}>{k === "review" ? EMPTY : durationText(secOf(d.refs[1][k].durMs))}</td>
                  <td className={ui.num}>{d.refs[2][k].openN}</td>
                  <td className={ui.num}>{durationText(secOf(d.refs[2][k].durMs))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.foot}>
          {flowB
            ? `Alur B · memo: jeda ${durationText(num(row.memo_gap_s))}, dibaca ${durationText(num(row.memo_read_s))} · reviu: jeda ${durationText(num(row.review_gap_s))}, dibaca ${durationText(num(row.review_read_s))}.`
            : `Alur A · waktu baca halaman Reviu Atasan: ${durationText(num(row.review_dur_s))}.`}
        </p>
      </section>

      <section className={shell.card} aria-labelledby="d-quest">
        <div className={ui.cardHead}>
          <h2 id="d-quest">Kuesioner dan demografi</h2>
          <span>Jawaban partisipan</span>
        </div>
        <ul className={styles.list}>
          {MINUTES_QUESTIONS.map((q) => (
            <li key={q.key}>
              <span className={styles.q}>Berita Acara · kesan ({q.key})</span>
              <span>{choice(responses[q.key], q.options)}</span>
            </li>
          ))}
          {COV.map((q, i) => {
            const answer = num(responses[`cov_q${i + 1}`]);
            const key = COV_KEY?.[`cov_q${i + 1}`];
            const mark = key === undefined || answer === null ? "" : answer === key ? " ✓" : " ✗";
            return (
              <li key={`cov${i}`}>
                <span className={styles.q}>Pengetahuan {i + 1} (cov_q{i + 1})</span>
                <span>{choice(answer, q.options)}{mark}</span>
              </li>
            );
          })}
          <li>
            <span className={styles.q}>Skor kovariat (cov_score)</span>
            <span>{row.cov_score === null ? `${EMPTY} (kunci belum tersedia)` : String(row.cov_score)}</span>
          </li>
          {MC_QUESTIONS.map((q) => (
            <li key={q.key}>
              <span className={styles.q}>Cek manipulasi ({q.key})</span>
              <span>{choice(responses[q.key], q.options)}</span>
            </li>
          ))}
          {LIKERT_STATEMENTS.map((st, i) => (
            <li key={`l${i}`}>
              <span className={styles.q}>{st}</span>
              <span>{choice(responses[`mc_likert${i + 1}`], LIKERT_LABELS)}</span>
            </li>
          ))}
          <li>
            <span className={styles.q}>Demografi</span>
            <span>
              Semester {cell(row.semester)} · {choice(row.gender, GENDER).replace(/^\d · /, "") || EMPTY} · umur {cell(row.age)} ·{" "}
              {choice(row.education, EDUCATION).replace(/^\d · /, "")}
            </span>
          </li>
        </ul>
      </section>

      <section className={shell.card} aria-labelledby="d-tl">
        <div className={ui.cardHead}>
          <h2 id="d-tl">Linimasa</h2>
          <span>Event penting; log lengkap lewat tombol di atas</span>
        </div>
        {props.timeline.length === 0 ? (
          <p className={styles.foot}>Belum ada event.</p>
        ) : (
          <ul className={styles.tl}>
            {props.timeline.map((e, i) => (
              <li key={i} style={{ display: "contents" }}>
                <time dateTime={e.ts}>{TIME_FMT.format(new Date(e.ms))}</time>
                <span>{e.label}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function RoundHeads() {
  return (
    <>
      <th scope="col" className={`${ui.num} ${styles.sep}`}>Dibuka</th>
      <th scope="col">Durasi</th>
      <th scope="col" className={ui.num}>Peringkat</th>
      <th scope="col">Simpan</th>
    </>
  );
}

function CaseCells(props: { stat: Metrics["detail"]["cases"][1][number]; rank: number | null; save: string; maxDur: number }) {
  const { stat, rank, save, maxDur } = props;
  const width = Math.round((stat.durMs / maxDur) * 80);
  return (
    <>
      <td className={`${ui.num} ${styles.sep}`}>{stat.openN || EMPTY}</td>
      <td className={styles.barCell}>
        {stat.openN ? (
          <>
            <span className={styles.bar} style={{ width }} aria-hidden="true" />
            {durationText(secOf(stat.durMs))}
            {stat.imputed ? "*" : ""}
          </>
        ) : (
          EMPTY
        )}
      </td>
      <td className={ui.num}>{rank ?? EMPTY}</td>
      <td>{save}</td>
    </>
  );
}
