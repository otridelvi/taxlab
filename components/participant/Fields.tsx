"use client";

import type { ItemSpec, ItemValues } from "@/lib/items";
import s from "./p.module.css";

export type FieldsProps = {
  items: ItemSpec[];
  values: ItemValues;
  /** Keys to mark as wrong (missing, invalid or repeated). */
  missing: string[];
  onChange: (key: string, value: unknown) => void;
};

const LETTERS = "abcdefghij";

/** Multiple-choice questions and plain text fields (the default view of a step's items). */
export function Fields({ items, values, missing, onChange }: FieldsProps) {
  const choices = items.filter((i) => i.type === "choice");
  const texts = items.filter((i) => i.type === "text" || i.type === "email");
  return (
    <>
      {choices.map((item) => {
        const bad = missing.includes(item.key);
        return (
          <fieldset key={item.key} className={`${s.q} ${bad ? s.qBad : ""}`}>
            <legend>
              {item.number !== undefined && <span className={s.qNo}>{item.number}.</span>}
              <span dangerouslySetInnerHTML={{ __html: item.legend }} />
            </legend>
            <div className={s.opts}>
              {item.options.map((label, i) => {
                const on = Number(values[item.key]) === i + 1;
                return (
                  <label key={i} className={`${s.opt} ${on ? s.optOn : ""} ${bad ? s.bad : ""}`}>
                    <input
                      type="radio"
                      name={item.key}
                      value={i + 1}
                      checked={on}
                      onChange={() => onChange(item.key, i + 1)}
                    />
                    {item.letters && <i className={s.optLetter}>{LETTERS[i]}.</i>}
                    <span dangerouslySetInnerHTML={{ __html: label }} />
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
      {texts.length > 0 && (
        <div className={s.fields}>
          {texts.map((item) => {
            if (item.type !== "text" && item.type !== "email") return null;
            const bad = missing.includes(item.key);
            return (
              <div key={item.key} className={s.fld}>
                <label htmlFor={`f-${item.key}`}>{item.label}</label>
                <input
                  id={`f-${item.key}`}
                  className={bad ? s.bad : undefined}
                  type={item.type === "email" ? "email" : "text"}
                  inputMode={item.type === "email" ? "email" : undefined}
                  autoComplete={item.autoComplete}
                  maxLength={item.maxLength}
                  value={String(values[item.key] ?? "")}
                  aria-invalid={bad || undefined}
                  onChange={(e) => onChange(item.key, e.target.value)}
                />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
