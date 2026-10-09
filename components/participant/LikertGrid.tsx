"use client";

import type { LikertItem } from "@/lib/items";
import type { FieldsProps } from "./Fields";
import s from "./p.module.css";

/**
 * Statements answered on a 1–5 agreement scale (PLAN-06 D-4). One radio group per statement;
 * every radio has an accessible name such as "4, Setuju". On phones only the two ends of the
 * scale are labelled, under the row of numbers.
 */
export function LikertGrid({ items, values, missing, onChange }: FieldsProps) {
  const rows = items.filter((i): i is LikertItem => i.type === "likert");
  return (
    <>
      {rows.map((item) => {
        const bad = missing.includes(item.key);
        const last = item.labels.length - 1;
        return (
          <fieldset key={item.key} className={`${s.q} ${bad ? s.qBad : ""}`}>
            <legend>
              {item.number !== undefined && <span className={s.qNo}>{item.number}.</span>}
              <span dangerouslySetInnerHTML={{ __html: item.statement }} />
            </legend>
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
          </fieldset>
        );
      })}
    </>
  );
}
