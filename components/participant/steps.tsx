import type { ReactNode } from "react";
import type { Step } from "@/content/flow";
import cases from "@/content/cases.json";
import * as T from "@/content/text";
import type { Factors } from "@/lib/cell";
import type { CaseView } from "./CasesBoard";
import { OpenDocButton } from "./OpenDoc";
import type { RefKey } from "./RefMenu";
import s from "./p.module.css";

/**
 * Server-rendered content of each step (texts from content/text.ts, layout from
 * the mockup). Only the variant for the participant's factors is rendered (PR-4).
 */

export function Html({
  html,
  as: Tag = "p",
  className,
}: {
  html: string;
  as?: "p" | "span" | "li" | "div";
  className?: string;
}) {
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

function Paras({ list }: { list: readonly string[] }) {
  return (
    <>
      {list.map((p, i) => (
        <Html key={i} html={p} />
      ))}
    </>
  );
}

export function Sheet({ children, doc = true }: { children: ReactNode; doc?: boolean }) {
  return <article className={`${s.sheet} ${doc ? s.doc : s.ui}`}>{children}</article>;
}

function Head({ kick, title }: { kick: string; title: ReactNode }) {
  return (
    <>
      <div className={s.kick}>{kick}</div>
      <h1 className={s.title}>{title}</h1>
    </>
  );
}

function Kop({ refNo }: { refNo: string }) {
  return (
    <div className={s.kop}>
      <div className={s.kopL}>
        <div className={s.mark} aria-hidden="true">
          W&amp;R
        </div>
        <div>
          <b>WIRADANA &amp; REKAN</b>
          <span>Kantor Konsultan Pajak</span>
        </div>
      </div>
      <div className={s.kopRef}>
        {refNo}
        <br />
        Internal · Rahasia
      </div>
    </div>
  );
}

function Ledger({ rows }: { rows: readonly (readonly [string, string])[] }) {
  return (
    <table className={s.ledger}>
      <thead>
        <tr>
          <th scope="col">Nama akun biaya</th>
          <th scope="col" className={s.num}>
            Jumlah
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, amount]) => (
          <tr key={name}>
            <td>{name}</td>
            <td className={s.num}>{amount}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td>Total</td>
          <td className={s.num}>Rp1.000.000.000</td>
        </tr>
      </tfoot>
    </table>
  );
}

function Accounts({ from, to }: { from: number; to: number }) {
  return (
    <ol className={s.accts} start={from + 1}>
      {T.ACCT.slice(from, to).map(([name, text], i) => (
        <li key={name}>
          <b>
            {from + i + 1}. {name}
          </b>
          <Html html={text} />
        </li>
      ))}
    </ol>
  );
}

/** Heading of a document: h1 on its own page, h2 inside the file panel. */
function DocTitle({ level = 1, children }: { level?: 1 | 2; children: ReactNode }) {
  const Tag = level === 1 ? "h1" : "h2";
  return <Tag className={s.title}>{children}</Tag>;
}

export function MemoDoc({ strong, level = 1 }: { strong: boolean; level?: 1 | 2 }) {
  return (
    <>
      <Kop refNo="MEMO/[NOMOR]" />
      <DocTitle level={level}>Memo Penugasan</DocTitle>
      <dl className={s.meta}>
        <div>
          <dt>Untuk</dt>
          <dd>Staf Pajak</dd>
        </div>
        <div>
          <dt>Dari</dt>
          <dd>Manajer Pajak</dd>
        </div>
        <div>
          <dt>Tanggal</dt>
          <dd>[TANGGAL]</dd>
        </div>
        <div>
          <dt>Subjek</dt>
          <dd>PT Cahaya Gama, rekonsiliasi fiskal</dd>
        </div>
      </dl>
      <Paras list={T.MEMO_BODY} />
      <ol className={s.points}>
        {(strong ? T.MEMO_STRONG : T.MEMO_WEAK).map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>
      <div className={s.note} style={{ margin: "8px 0 20px" }}>
        <strong className={s.lbl}>Diingatkan kembali</strong>
        {T.MEMO_REMIND}
      </div>
      <p style={{ fontStyle: "italic" }}>Manajer Pajak</p>
    </>
  );
}

/** Placeholder Reviu Atasan (PERTANYAAN A6/Q8): same text for every cell until the researcher decides. */
function reviewParas(f: Factors): readonly string[] {
  void f; // add per-factor variants here when the final text exists
  return T.REVIEW_BODY;
}

export function ReviewDoc({ f, level = 1 }: { f: Factors; level?: 1 | 2 }) {
  return (
    <>
      <Kop refNo="REVIU/[NOMOR]" />
      <DocTitle level={level}>{T.REVIEW_TITLE}</DocTitle>
      <dl className={s.meta}>
        <div>
          <dt>Untuk</dt>
          <dd>Staf Pajak</dd>
        </div>
        <div>
          <dt>Dari</dt>
          <dd>Manajer Pajak</dd>
        </div>
        <div>
          <dt>Tanggal</dt>
          <dd>[TANGGAL]</dd>
        </div>
        <div>
          <dt>Subjek</dt>
          <dd>{T.REVIEW_SUBJECT}</dd>
        </div>
      </dl>
      <Paras list={reviewParas(f)} />
      <p style={{ fontStyle: "italic" }}>Manajer Pajak</p>
    </>
  );
}

function RoleBody() {
  return (
    <>
      <Html html={T.ROLE_P1} />
      <p>
        Anda akan membutuhkan waktu sekitar <strong>30 menit</strong> untuk:
      </p>
      <ol className={s.steps}>
        {T.ROLE_STEPS.map((t, i) => (
          <li key={t}>
            <span>{i + 1}</span>
            {t}
          </li>
        ))}
      </ol>
      <Html html={T.ROLE_P2} />
    </>
  );
}

/** Flow B (B-5): the Berita Acara as official minutes: letterhead, number and the parties. */
function NotulenHead({ level = 1 }: { level?: 1 | 2 }) {
  return (
    <>
      <Kop refNo="BA/[NOMOR]" />
      <DocTitle level={level}>Ikhtisar Berita Acara Pertemuan dengan Manajemen Klien</DocTitle>
      <dl className={s.meta}>
        <div>
          <dt>Klien</dt>
          <dd>PT Cahaya Gama</dd>
        </div>
        <div>
          <dt>Pihak</dt>
          <dd>Manajemen klien</dd>
        </div>
        <div>
          <dt>Tanggal</dt>
          <dd>[TANGGAL]</dd>
        </div>
        <div>
          <dt>Perihal</dt>
          <dd>Rekonsiliasi fiskal</dd>
        </div>
      </dl>
    </>
  );
}

function MinutesBody({ f }: { f: Factors }) {
  return f.pref === "impl" ? <Html html={T.MIN_IMPL} /> : <Paras list={T.MIN_EXPL} />;
}

/** Flow B (B-3, B-4): a closed document that arrives in the inbox; the button opens it. */
function Envelope({
  target,
  title,
  subject,
  intro,
  button,
}: {
  target: "memo" | "review";
  title: string;
  subject: string;
  intro: readonly string[];
  button: string;
}) {
  return (
    <Sheet doc={false}>
      <div className={s.env}>
        <div className={s.envhead}>
          <div className={s.envico} aria-hidden="true">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M3 5h18v14H3zM3 6l9 7 9-7" />
            </svg>
          </div>
          <div>
            <div className={s.kick}>{T.ENVELOPE.kick}</div>
            <h1 className={s.title} style={{ margin: "2px 0 0", fontSize: 28 }}>
              {title}
            </h1>
          </div>
        </div>
        <dl className={s.dl} style={{ width: "100%", margin: 0 }}>
          <dt>Dari</dt>
          <dd>Manajer Pajak</dd>
          <dt>Untuk</dt>
          <dd>Staf Pajak</dd>
          <dt>Perihal</dt>
          <dd>{subject}</dd>
        </dl>
        <Paras list={intro} />
        <OpenDocButton target={target} label={button} />
      </div>
    </Sheet>
  );
}

/** The case instructions page (flow A, and flow B round 1 as its own page). */
function CasesIntroBody() {
  return (
    <>
      <div className={s.kick}>Kasus acuan</div>
      <h1 className={s.title}>Mempelajari kasus serupa</h1>
      <Paras list={T.CASES_INTRO} />
      <ul className={s.points}>
        {T.CASES_LIST.map((t) => (
          <Html key={t} as="li" html={t} />
        ))}
      </ul>
      <div className={s.callout} style={{ margin: "8px 0 20px" }}>
        <strong className={s.lbl}>Perintah memeringkat dan menyimpan</strong>
        <span dangerouslySetInnerHTML={{ __html: T.RANK_ORDER }} />
      </div>
      <div className={s.note} style={{ marginBottom: 20 }}>
        <strong className={s.lbl}>Perhatian</strong>
        {T.ATTN}
      </div>
      <p className={s.muted} style={{ fontFamily: "var(--font-sans)" }}>
        Kasus-kasus tersebut disajikan mulai dari halaman berikutnya. {T.CASES_FOOT}
      </p>
    </>
  );
}

function FactsIntro() {
  return (
    <>
      <dl className={s.dl}>
        <dt>Nama klien</dt>
        <dd>PT Cahaya Gama</dd>
        <dt>Intisari kasus</dt>
        <dd>Minta saran atas rekonsiliasi fiskal yang telah disiapkan oleh staf pajak perusahaan.</dd>
      </dl>
      <Html html={T.FACT1_P} />
      <div className={s.kick} style={{ marginTop: 8 }}>
        Rencana bisnis perusahaan
      </div>
      <ol className={s.plan} aria-label="Rencana bisnis perusahaan">
        {T.PLAN.map((t, i) => (
          <li key={t} className={i === T.PLAN.length - 1 ? s.planEnd : undefined}>
            <small>{i + 1}</small>
            {t}
          </li>
        ))}
      </ol>
    </>
  );
}

function RefHead({ title }: { title: string }) {
  return (
    <>
      <div className={s.kick}>Berkas penugasan</div>
      <h2 className={s.title}>{title}</h2>
    </>
  );
}

/**
 * The reference files of the menu Berkas penugasan, in the variant of the participant's
 * cell. Rendered on the server; only the files the step offers are sent (PLAN-04 D-8).
 */
export function refDocs(
  f: Factors,
  keys: readonly RefKey[],
  flow: "A" | "B" = "A",
): Partial<Record<RefKey, ReactNode>> {
  const all: Record<RefKey, () => ReactNode> = {
    facts: () => (
      <>
        <RefHead title="Fakta Klien" />
        <FactsIntro />
        <Paras list={T.FACT2_P} />
        <Ledger rows={T.COSTS_FACT} />
        <h3 className={s.h2}>Keterangan akun</h3>
        <Accounts from={0} to={4} />
      </>
    ),
    minutes: () =>
      flow === "B" ? (
        <>
          <div className={s.kick}>Berkas penugasan</div>
          <NotulenHead level={2} />
          <MinutesBody f={f} />
        </>
      ) : (
        <>
          <RefHead title="Ikhtisar Berita Acara Pertemuan dengan Manajemen Klien" />
          <MinutesBody f={f} />
        </>
      ),
    memo: () => <MemoDoc strong={f.acc === "strong"} level={2} />,
    review: () => <ReviewDoc f={f} level={2} />,
  };
  return Object.fromEntries(keys.map((k) => [k, all[k]()]));
}

export type StepView = {
  content: ReactNode;
  footNote?: string;
  fieldsTitle?: string;
  fieldsIntro?: string;
  /** Flow B questionnaire: titles and intros of part A and part B. */
  parts?: { mcq: { title: string; intro: string }; likert: { title: string; intro: string } };
  /** Kick + h1 of the items sheet (steps that are only their items). */
  heading?: { kick: string; title: string };
  /** Flow B: the document of the step is closed (items hidden, Next off). */
  locked?: boolean;
};

export type StepContext = {
  flow: "A" | "B";
  /** Flow B: the participant already opened this step's document (memo / review). */
  docOpened: boolean;
};

/** Content for a step. A step without a case here renders a fallback page. */
export function stepView(
  step: Step,
  f: Factors,
  ctx: StepContext = { flow: "A", docOpened: true },
): StepView {
  switch (step.id) {
    case "welcome":
      return {
        footNote: "Pastikan koneksi internet anda stabil.",
        content: (
          <Sheet>
            <Head kick="Selamat datang" title="Selamat Datang" />
            <Paras list={T.WELCOME} />
            <div className={s.figures}>
              <div>
                <strong>40 mnt</strong>
                <span>Total waktu, tanpa jeda</span>
              </div>
              <div>
                <strong>30 mnt</strong>
                <span>Penugasan</span>
              </div>
              <div>
                <strong>10 mnt</strong>
                <span>Pertanyaan terkait penugasan</span>
              </div>
            </div>
            <p>
              Sistem akan menampilkan waktu tersisa yang anda miliki dengan cara hitung mundur (
              <em>count-down</em>) yang ditaruh di pojok kanan atas layar. Hitung mundur dimulai ketika anda
              menekan <strong>Mulai penugasan</strong>.
            </p>
          </Sheet>
        ),
      };
    case "role":
      return {
        content: (
          <Sheet>
            <Head kick="Petunjuk · peran anda" title="Peran dan tugas anda" />
            <RoleBody />
          </Sheet>
        ),
      };
    case "instructions":
      return {
        content: (
          <Sheet>
            <Head kick="Petunjuk" title="Petunjuk penugasan" />
            <section className={s.part}>
              <h2 className={s.h2}>1. {T.INSTRUCTION_TITLES[0]}</h2>
              <RoleBody />
            </section>
            <section className={s.part}>
              <h2 className={s.h2}>2. {T.INSTRUCTION_TITLES[1]}</h2>
              <Paras list={T.RULES} />
            </section>
            <section className={s.part}>
              <h2 className={s.h2}>3. {T.INSTRUCTION_TITLES[2]}</h2>
              <Paras list={T.CASEINFO} />
            </section>
          </Sheet>
        ),
      };
    case "rules":
      return {
        content: (
          <Sheet>
            <Head kick="Petunjuk · aturan" title="Aturan penugasan" />
            <Paras list={T.RULES} />
          </Sheet>
        ),
      };
    case "case_info":
      return {
        content: (
          <Sheet>
            <Head kick="Petunjuk · kasus acuan" title="Informasi kasus acuan" />
            <Paras list={T.CASEINFO} />
          </Sheet>
        ),
      };
    case "facts_1":
      return {
        footNote: ctx.flow === "B" ? "Halaman 1 dari 2" : "Halaman 1 dari 4",
        content: (
          <Sheet>
            <Head
              kick={ctx.flow === "B" ? "Fakta Klien · 1 dari 2" : "Fakta Klien · 1 dari 4"}
              title="Fakta Klien"
            />
            <FactsIntro />
          </Sheet>
        ),
      };
    case "facts_2":
      return {
        footNote: "Halaman 2 dari 4",
        content: (
          <Sheet>
            <Head kick="Fakta Klien · 2 dari 4" title="Biaya yang masih meragukan" />
            <Paras list={T.FACT2_P} />
            <Ledger rows={T.COSTS_FACT} />
          </Sheet>
        ),
      };
    case "facts_3":
      return {
        footNote: "Halaman 3 dari 4",
        content: (
          <Sheet>
            <Head kick="Fakta Klien · 3 dari 4" title="Keterangan akun" />
            <p>Keterangan ringkas terhadap akun-akun tersebut adalah sebagai berikut:</p>
            <Accounts from={0} to={2} />
            <div className={s.note} style={{ marginTop: 24 }}>
              <strong className={s.lbl}>Catatan</strong>
              {T.NOTEPAD}
            </div>
          </Sheet>
        ),
      };
    case "facts_4":
      return {
        footNote: "Halaman 4 dari 4",
        content: (
          <Sheet>
            <Head kick="Fakta Klien · 4 dari 4" title="Keterangan akun (lanjutan)" />
            <Accounts from={2} to={4} />
          </Sheet>
        ),
      };
    case "facts_costs":
      return {
        footNote: "Halaman 2 dari 2",
        content: (
          <Sheet>
            <Head kick="Fakta Klien · 2 dari 2" title="Biaya yang masih meragukan" />
            <Paras list={T.FACT2_P} />
            <div className={s.acards}>
              {T.ACCT.map(([name, text], i) => (
                <div key={name} className={s.acard}>
                  <div className={s.ah}>
                    <b>
                      {i + 1}. {name}
                    </b>
                    <span>{T.COSTS_FACT[i][1]}</span>
                  </div>
                  <Html html={text} />
                </div>
              ))}
            </div>
            <div className={s.atotal}>
              <b>Total</b>
              <span>Rp1.000.000.000</span>
            </div>
            <div className={s.note} style={{ marginTop: 24 }}>
              <strong className={s.lbl}>Catatan</strong>
              {T.NOTEPAD}
            </div>
          </Sheet>
        ),
      };
    case "minutes":
      return {
        fieldsTitle: "Kesan anda dari pertemuan",
        content:
          ctx.flow === "B" ? (
            <Sheet>
              <NotulenHead />
              <MinutesBody f={f} />
            </Sheet>
          ) : (
            <Sheet>
              <Head kick="Berkas klien" title="Ikhtisar Berita Acara Pertemuan dengan Manajemen Klien" />
              <MinutesBody f={f} />
            </Sheet>
          ),
      };
    case "memo_intro":
      return {
        content: (
          <Sheet>
            <Head kick="Memo penugasan" title="Sebelum memulai pekerjaan" />
            <Paras list={T.MEMO_INTRO} />
          </Sheet>
        ),
      };
    case "memo":
      if (step.gate && !ctx.docOpened) {
        return {
          locked: true,
          content: (
            <Envelope
              target="memo"
              title={T.ENVELOPE.memo.title}
              subject={T.ENVELOPE.memo.subject}
              intro={T.MEMO_INTRO.slice(0, 1)}
              button={T.ENVELOPE.memo.button}
            />
          ),
        };
      }
      return {
        fieldsTitle: "Identitas staf",
        fieldsIntro: "Sesuai memo, cantumkan nama dan alamat email anda sebelum melanjutkan.",
        content: (
          <Sheet>
            <MemoDoc strong={f.acc === "strong"} />
          </Sheet>
        ),
      };
    case "cases_intro_r1":
    case "cases_intro_r2":
      return {
        content: (
          <Sheet>
            <CasesIntroBody />
          </Sheet>
        ),
      };
    case "rec_intro_r1":
    case "rec_intro_r2":
      return {
        content: (
          <Sheet>
            <Head kick="Rekomendasi" title="Menyusun rekomendasi" />
            <Html html={step.id === "rec_intro_r1" ? T.REC_INTRO_1 : T.REC_INTRO_2} />
          </Sheet>
        ),
      };
    case "client_draft_r1":
    case "client_draft_r2":
      return {
        content: (
          <Sheet>
            <Head kick="Rekomendasi" title="Usulan biaya menurut draft klien" />
            <p>Berikut ditampilkan kembali usulan biaya berdasarkan draft yang disiapkan klien.</p>
            <Ledger rows={T.COSTS_DRAFT} />
          </Sheet>
        ),
      };
    case "cases_r1":
    case "cases_r2":
      // Flow B (B-7): the round 2 instructions sit above the list as a banner.
      return {
        footNote: T.CASES_TEXT.foot,
        content:
          ctx.flow === "B" && step.id === "cases_r2" ? (
            <section className={`${s.instrBanner} ${s.ui}`}>
              <strong className={s.lbl}>Instruksi</strong>
              <Paras list={T.CASES_INTRO} />
              <ul>
                {T.CASES_LIST.map((x) => (
                  <Html key={x} as="li" html={x} />
                ))}
              </ul>
              <Html html={T.RANK_ORDER} />
              <p>{T.ATTN}</p>
              <p>{T.CASES_FOOT}</p>
            </section>
          ) : null,
      };
    case "covariates":
      return {
        heading: { kick: "Pertanyaan", title: "Pertanyaan pengetahuan" },
        fieldsIntro: T.COV_INTRO,
        content: null,
      };
    case "rec_r1":
    case "rec_r2":
      // Flow B (B-6): the client draft sits above, as its own read-only table.
      if (ctx.flow === "B") {
        return {
          fieldsTitle: T.REC_TEXT.title,
          fieldsIntro: T.REC_TEXT.hint,
          footNote: T.REC_TEXT.footB,
          content: (
            <Sheet>
              <Head kick="Rekomendasi" title="Menyusun rekomendasi" />
              <Html html={step.id === "rec_r1" ? T.REC_INTRO_1 : T.REC_INTRO_2} />
              <h2 className={s.h2}>Usulan biaya menurut draft klien</h2>
              <p>Berikut ditampilkan kembali usulan biaya berdasarkan draft yang disiapkan klien.</p>
              <Ledger rows={T.COSTS_DRAFT} />
            </Sheet>
          ),
        };
      }
      return {
        heading: { kick: "Rekomendasi", title: T.REC_TEXT.title },
        fieldsIntro: T.REC_TEXT.hint,
        footNote: T.REC_TEXT.foot,
        content: null,
      };
    case "confidence_r1":
    case "confidence_r2":
      return {
        heading: { kick: "Rekomendasi", title: "Tingkat keyakinan" },
        fieldsIntro: T.CONF_TEXT,
        content: null,
      };
    case "review":
      if (step.gate && !ctx.docOpened) {
        return {
          locked: true,
          content: (
            <Envelope
              target="review"
              title={T.ENVELOPE.review.title}
              subject={T.ENVELOPE.review.subject}
              intro={[T.ENVELOPE.review.intro]}
              button={T.ENVELOPE.review.button}
            />
          ),
        };
      }
      return {
        footNote: T.REVIEW_FOOT,
        content: (
          <Sheet>
            <ReviewDoc f={f} />
          </Sheet>
        ),
      };
    case "debriefing":
      return {
        content: (
          <Sheet>
            <Head
              kick="Penutup"
              title={
                <>
                  Taklimat (<em>Debriefing</em>)
                </>
              }
            />
            <Paras list={T.DEBRIEF} />
            <p style={{ fontStyle: "italic", marginTop: 20 }}>Fauzan Misra</p>
          </Sheet>
        ),
      };
    case "time_up":
      return {
        content: (
          <Sheet doc={false}>
            <Head kick="Waktu habis" title="Waktu penugasan telah habis" />
            <p>Jawaban anda sudah tersimpan. Silakan lanjut ke pertanyaan berikutnya.</p>
          </Sheet>
        ),
      };
    case "questionnaire":
      return {
        heading: { kick: "Kuesioner · 1 dari 2", title: "Pengalaman selama penugasan" },
        parts: {
          mcq: { title: T.QUEST_PARTS.mcq, intro: T.MC_INTRO },
          likert: { title: T.QUEST_PARTS.likert, intro: T.LIKERT_INTRO },
        },
        content: null,
      };
    case "mc_choice":
      return {
        heading: { kick: "Kuesioner · 1 dari 3", title: "Pengalaman selama penugasan" },
        fieldsIntro: T.MC_INTRO,
        content: null,
      };
    case "mc_likert":
      return {
        heading: { kick: "Kuesioner · 2 dari 3", title: "Pengalaman selama penugasan (lanjutan)" },
        fieldsIntro: T.LIKERT_INTRO,
        content: null,
      };
    case "demographics":
      return {
        heading: {
          kick: ctx.flow === "B" ? "Kuesioner · 2 dari 2" : "Kuesioner · 3 dari 3",
          title: T.DEMO_TEXT.title,
        },
        content: null,
      };
    default:
      return {
        content: (
          <Sheet doc={false}>
            <Head kick="Segera hadir" title="Halaman ini belum tersedia" />
            <p className={s.muted}>
              Isi halaman <code>{step.id}</code> belum disiapkan. Tekan Next untuk melanjutkan alur.
            </p>
          </Sheet>
        ),
      };
  }
}

/**
 * The 14 reference cases, identical in both rounds (PRD P-64). Detail text comes from
 * content/cases.json (placeholder until the researcher supplies it) and is rendered here,
 * on the server, as ready-made elements (PLAN-04 D-5).
 */
export function caseViews(): CaseView[] {
  return cases.map((c) => ({
    no: c.no,
    name: c.name,
    summary: c.summary,
    detail: c.detail.map((p, i) => <p key={i}>{p}</p>),
  }));
}
