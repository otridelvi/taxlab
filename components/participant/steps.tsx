import type { ReactNode } from "react";
import type { Step } from "@/content/flow";
import * as T from "@/content/text";
import type { Factors } from "@/lib/cell";
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

export function MemoDoc({ strong }: { strong: boolean }) {
  return (
    <>
      <Kop refNo="MEMO/[NOMOR]" />
      <h1 className={s.title}>Memo Penugasan</h1>
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

export type StepView = {
  content: ReactNode;
  footNote?: string;
  fieldsTitle?: string;
  fieldsIntro?: string;
};

/** Content for a step. Steps built in later plans render a placeholder (PLAN-03 D-8). */
export function stepView(step: Step, f: Factors): StepView {
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
        footNote: "Halaman 1 dari 4",
        content: (
          <Sheet>
            <Head kick="Fakta Klien · 1 dari 4" title="Fakta Klien" />
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
    case "minutes":
      return {
        fieldsTitle: "Kesan anda dari pertemuan",
        content: (
          <Sheet>
            <Head kick="Berkas klien" title="Ikhtisar Berita Acara Pertemuan dengan Manajemen Klien" />
            {f.pref === "impl" ? <Html html={T.MIN_IMPL} /> : <Paras list={T.MIN_EXPL} />}
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
            <Head kick="Kasus acuan" title="Mempelajari kasus serupa" />
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
    default:
      return {
        content: (
          <Sheet doc={false}>
            <Head kick="Segera hadir" title="Halaman ini disiapkan pada tahap berikutnya" />
            <p className={s.muted}>
              Pratinjau SIT: isi halaman <code>{step.id}</code> dibangun pada PLAN-04/05. Tekan Next untuk
              melanjutkan alur.
            </p>
          </Sheet>
        ),
      };
  }
}
