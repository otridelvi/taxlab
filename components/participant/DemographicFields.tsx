"use client";

import type { ChoiceItem, IntegerItem, PhoneItem, SelectItem } from "@/lib/items";
import type { FieldsProps } from "./Fields";
import s from "./p.module.css";

/** Phone shown without the +62 that the prefix box already displays. */
function nationalPart(value: unknown): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("+62") ? v.slice(3) : v;
}

/**
 * Demographics (semester, gender, age, education) and the optional incentive claim
 * (e-wallet + phone), PLAN-06. Numbers use the numeric keyboard; gender and education are
 * pills; the incentive fields sit together under one legend with the privacy note.
 */
export function DemographicFields({ items, values, missing, onChange }: FieldsProps) {
  const incentive = items.filter(
    (i): i is SelectItem | PhoneItem => i.type === "select" || i.type === "phone",
  );
  const legend = incentive.find((i): i is SelectItem => i.type === "select")?.groupLegend;
  const note = incentive.find((i): i is PhoneItem => i.type === "phone")?.note;

  return (
    <div className={s.demo}>
      {items.map((item) => {
        if (item.type === "integer") return numberField(item);
        if (item.type === "choice") return pillField(item);
        return null;
      })}
      {incentive.length > 0 && (
        <fieldset className={s.incentive}>
          {legend && <legend>{legend}</legend>}
          <div className={s.incentiveGrid}>
            {incentive.map((item) => {
              const bad = missing.includes(item.key);
              if (item.type === "select") {
                return (
                  <div key={item.key} className={s.fld}>
                    <label htmlFor={`f-${item.key}`}>{item.label}</label>
                    <select
                      id={`f-${item.key}`}
                      className={`${s.select} ${bad ? s.bad : ""}`}
                      value={String(values[item.key] ?? "")}
                      aria-invalid={bad || undefined}
                      onChange={(e) => onChange(item.key, e.target.value)}
                    >
                      <option value="">Pilih e-wallet</option>
                      {item.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }
              return (
                <div key={item.key} className={s.fld}>
                  <label htmlFor={`f-${item.key}`}>{item.label}</label>
                  <div className={`${s.affix} ${s.affixPlain} ${bad ? s.bad : ""}`}>
                    <span aria-hidden="true">+62</span>
                    <input
                      id={`f-${item.key}`}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="812 3456 7890"
                      maxLength={item.maxLength}
                      value={nationalPart(values[item.key])}
                      aria-invalid={bad || undefined}
                      onChange={(e) => {
                        let text = e.target.value.replace(/[^\d\s+().-]/g, "");
                        if (text.startsWith("+62")) text = text.slice(3);
                        onChange(item.key, text);
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {note && <p className={s.muted}>{note}</p>}
        </fieldset>
      )}
    </div>
  );

  // Plain render functions (not components), so inputs keep focus while typing.
  function numberField(item: IntegerItem) {
    const bad = missing.includes(item.key);
    const raw = values[item.key];
    const text = typeof raw === "number" ? String(raw) : typeof raw === "string" ? raw : "";
    const input = (
      <input
        id={`f-${item.key}`}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={item.placeholder}
        aria-invalid={bad || undefined}
        value={text}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
          onChange(item.key, digits ? Number(digits) : "");
        }}
      />
    );
    return (
      <div key={item.key} className={`${s.fld} ${s.demoNum}`}>
        <label htmlFor={`f-${item.key}`}>{item.label ?? item.name}</label>
        {item.unit ? (
          <div className={`${s.affix} ${s.affixPlain} ${s.affixAfter} ${bad ? s.bad : ""}`}>
            {input}
            <span aria-hidden="true">{item.unit}</span>
          </div>
        ) : (
          <div className={bad ? s.badWrap : undefined}>{input}</div>
        )}
      </div>
    );
  }

  function pillField(item: ChoiceItem) {
    const bad = missing.includes(item.key);
    return (
      <fieldset key={item.key} className={`${s.demoGroup} ${bad ? s.qBad : ""}`}>
        <legend dangerouslySetInnerHTML={{ __html: item.legend }} />
        <div className={s.pills}>
          {item.options.map((label, i) => {
            const on = Number(values[item.key]) === i + 1;
            return (
              <label key={i} className={`${s.pill} ${on ? s.optOn : ""} ${bad ? s.bad : ""}`}>
                <input
                  type="radio"
                  name={item.key}
                  value={i + 1}
                  checked={on}
                  onChange={() => onChange(item.key, i + 1)}
                />
                <span dangerouslySetInnerHTML={{ __html: label }} />
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }
}
