"use client";

import { useId } from "react";
import type { LikertItem } from "@/lib/items";
import type { FieldsProps } from "./Fields";
import s from "./p.module.css";

/**
 * Statements answered on a 1–5 agreement scale (PLAN-06 D-4). One radio group per statement;
 * every radio has an accessible name such as "4, Setuju". Desktop: a table, with the scale
 * labels once in the header and only the radios in the rows (mockup XD19). Phones: the numbers
 * as boxes, with only the two ends of the scale labelled under them (mockup XM19).
 */
export function LikertGrid({ items, values, missing, onChange }: FieldsProps) {
  const uid = useId();
  const rows = items.filter((i): i is LikertItem => i.type === "likert");
  const labels = rows[0]?.labels ?? [];
  return (
    <div className={s.lk}>
      <div className={s.lkHead} aria-hidden="true">
        <span>Pernyataan</span>
        <div className={s.lkHeadCols}>
          {labels.map((label, i) => (
            <span key={i}>
              {i + 1}
              <br />
              {label}
            </span>
          ))}
        </div>
      </div>
      {rows.map((item) => {
        const bad = missing.includes(item.key);
        const last = item.labels.length - 1;
        const stmtId = `${uid}-${item.key}`;
        return (
          <div
            key={item.key}
            role="group"
            aria-labelledby={stmtId}
            className={`${s.lkRow} ${bad ? s.qBad : ""}`}
          >
            <p id={stmtId} className={s.lkStmt}>
              {item.number !== undefined && <span className={s.qNo}>{item.number}.</span>}
              <span dangerouslySetInnerHTML={{ __html: item.statement }} />
            </p>
            <div className={`${s.scale} ${bad ? s.scaleBad : ""}`}>
              {item.labels.map((label, i) => {
                const on = Number(values[item.key]) === i + 1;
                return (
                  <label key={i} className={`${s.scaleOpt} ${on ? s.optOn : ""}`}>
                    <input
                      type="radio"
                      name={item.key}
                      value={i + 1}
                      checked={on}
                      aria-label={`${i + 1}, ${label}`}
                      onChange={() => onChange(item.key, i + 1)}
                    />
                    <b aria-hidden="true">{i + 1}</b>
                    <span aria-hidden="true">{label}</span>
                  </label>
                );
              })}
            </div>
            <div className={s.scaleEnds} aria-hidden="true">
              <span>{item.labels[0]}</span>
              <span>{item.labels[last]}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
