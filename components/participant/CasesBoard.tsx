"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { CASES_TEXT } from "@/content/text";
import type { IntegerItem, ItemSpec, ItemValues } from "@/lib/items";
import { track } from "./events-client";
import { caseTarget, startCase, stopCase } from "./reading";
import s from "./p.module.css";

export type CaseView = {
  no: number;
  name: string;
  summary: string;
  /** Detail text, rendered on the server (PLAN-04 D-5). */
  detail: ReactNode;
};

type Props = {
  cases: CaseView[];
  items: ItemSpec[];
  values: ItemValues;
  /** Keys marked as wrong: missing, or a repeated rank. */
  missing: string[];
  /** Case numbers opened in this round, according to the server. */
  opened: number[];
  round: 1 | 2;
  onChange: (key: string, value: unknown) => void;
};

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The 14 reference cases (PRD P-31/P-42, FSD §9.3): fixed order, one DETAIL open at a time,
 * a rank 1–14 that can only be used once, and Save yes/no. Wide table on desktop, cards on phones.
 */
export function CasesBoard({ cases, items, values, missing, opened, round, onChange }: Props) {
  const uid = useId();
  const [openNo, setOpenNo] = useState<number | null>(null);
  const [seen, setSeen] = useState<ReadonlySet<number>>(new Set());

  // A case still open when this page goes away is closed (reason "leave"); no-op if already closed.
  useEffect(() => () => stopCase("leave"), []);

  const rankKey = (no: number) => `rank_case${pad(no)}_r${round}`;
  const saveKey = (no: number) => `save_case${pad(no)}_r${round}`;
  const rankOf = (no: number): number | null => {
    const v = values[rankKey(no)];
    return typeof v === "number" ? v : null;
  };
  const saveOf = (no: number): 0 | 1 | null => {
    const v = values[saveKey(no)];
    return v === 0 || v === 1 ? v : null;
  };

  const usedBy = new Map<number, number>(); // rank → case number
  for (const c of cases) {
    const r = rankOf(c.no);
    if (r !== null) usedBy.set(r, c.no);
  }
  const everOpened = new Set<number>([...opened, ...seen]);
  const rankedCount = cases.filter((c) => rankOf(c.no) !== null).length;
  const savedCount = cases.filter((c) => saveOf(c.no) !== null).length;
  const rankItem = (no: number) => items.find((i): i is IntegerItem => i.key === rankKey(no));
  const maxRank = rankItem(1)?.max ?? cases.length;

  function toggle(no: number) {
    if (openNo === no) {
      stopCase("toggle");
      setOpenNo(null);
      return;
    }
    startCase(no); // closes the previous detail first ("switch")
    setOpenNo(no);
    setSeen((prev) => new Set(prev).add(no));
  }

  function setRank(no: number, text: string) {
    const value = text === "" ? null : Number(text);
    onChange(rankKey(no), value ?? "");
    track("rank_set", caseTarget(no), { value });
  }

  function setSave(no: number, value: 0 | 1) {
    onChange(saveKey(no), value);
    track("save_set", caseTarget(no), { value });
  }

  return (
    <>
      <section className={`${s.sheet} ${s.ui} ${s.casesIntro}`}>
        <div className={s.kick}>Kasus acuan</div>
        <h1 className={s.title}>{CASES_TEXT.title}</h1>
        <p dangerouslySetInnerHTML={{ __html: CASES_TEXT.lead }} />
        <div className={s.cstat} aria-live="polite">
          <span>
            Dibuka <b>{everOpened.size}</b>/{cases.length}
          </span>
          <span>
            Peringkat <b>{rankedCount}</b>/{cases.length}
          </span>
          <span>
            Simpan <b>{savedCount}</b>/{cases.length}
          </span>
        </div>
      </section>

      <div className={s.box}>
        <div className={s.listHead}>
          <b>{CASES_TEXT.head}</b>
          <span>{CASES_TEXT.headHint}</span>
        </div>
        <ol className={s.clist}>
          {cases.map((c) => {
            const isOpen = openNo === c.no;
            const rank = rankOf(c.no);
            const save = saveOf(c.no);
            const badRank = missing.includes(rankKey(c.no));
            const badSave = missing.includes(saveKey(c.no));
            const detailId = `${uid}-detail-${c.no}`;
            const rankId = `${uid}-rank-${c.no}`;
            const saveLabelId = `${uid}-savelab-${c.no}`;
            return (
              <li
                key={c.no}
                className={`${s.kcRow} ${isOpen ? s.kcRowOpen : ""}`}
                data-case={c.no}
                data-open={isOpen || undefined}
              >
                <div className={s.kc}>
                  <span className={s.cno}>{c.no}.</span>
                  <div className={s.kcBody}>
                    <div className={s.cname}>{c.name}</div>
                    <div className={s.csum}>{c.summary}</div>
                    {everOpened.has(c.no) && <span className={s.seen}>Sudah dibuka</span>}
                  </div>
                  <div className={s.kcCtl}>
                    <button
                      type="button"
                      className={`${s.dbtn} ${isOpen ? s.dbtnOn : ""}`}
                      aria-expanded={isOpen}
                      aria-controls={detailId}
                      onClick={() => toggle(c.no)}
                    >
                      {isOpen ? "TUTUP" : "DETAIL"}
                      <span className={s.sr}> kasus {c.no}</span>
                    </button>
                    <div className={s.kcTwo}>
                      <div className={s.kcCell}>
                        <label className={s.lab} htmlFor={rankId}>
                          Peringkat
                        </label>
                        <select
                          id={rankId}
                          className={`${s.rsel} ${badRank ? s.badSel : ""}`}
                          value={rank === null ? "" : String(rank)}
                          aria-invalid={badRank || undefined}
                          onChange={(e) => setRank(c.no, e.target.value)}
                        >
                          <option value="" disabled={rank === null}>
                            {rank === null ? "Pilih" : "Kosongkan"}
                          </option>
                          {Array.from({ length: maxRank }, (_, i) => i + 1).map((n) => {
                            const taken = usedBy.has(n) && usedBy.get(n) !== c.no;
                            return (
                              <option key={n} value={n} disabled={taken}>
                                {taken ? `${n} · terpakai` : n}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div className={s.kcCell} role="radiogroup" aria-labelledby={saveLabelId}>
                        <span className={s.lab} id={saveLabelId}>
                          <span className={s.labLong}>Simpan sebagai acuan?</span>
                          <span className={s.labShort} aria-hidden="true">
                            Simpan?
                          </span>
                        </span>
                        {/* Segmented toggle: two radios styled as one switch, so "not answered" stays possible. */}
                        <div className={`${s.toggle} ${badSave ? s.badToggle : ""}`}>
                          {(
                            [
                              [1, "Ya"],
                              [0, "Tidak"],
                            ] as const
                          ).map(([v, label]) => (
                            <label key={v} className={save === v ? s.toggleOn : undefined}>
                              <input
                                type="radio"
                                name={`${uid}-save-${c.no}`}
                                checked={save === v}
                                onChange={() => setSave(c.no, v)}
                                aria-label={`${label}, simpan ${c.name} sebagai acuan`}
                              />
                              <span aria-hidden="true">{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {isOpen && (
                  <div className={s.cdet} id={detailId} role="region" aria-label={`Detail kasus ${c.name}`}>
                    <div className={s.kick}>Detail kasus {c.no}</div>
                    <h3>{c.name}</h3>
                    {c.detail}
                    <div className={s.cdetRow}>
                      <button type="button" className={s.xbtn} onClick={() => toggle(c.no)}>
                        Tutup detail
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}
