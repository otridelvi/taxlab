"use client";

import type { IntegerItem } from "@/lib/items";
import type { FieldsProps } from "./Fields";
import s from "./p.module.css";

/** Confidence 0–100 %: slider and number box that always show the same value. */
export function ConfidenceField({ items, values, missing, onChange }: FieldsProps) {
  const item = items.find((i): i is IntegerItem => i.type === "integer");
  if (!item) return null;
  const raw = values[item.key];
  const value = typeof raw === "number" ? raw : null;
  const bad = missing.includes(item.key);

  return (
    <div className={s.conf}>
      <div className={s.confRange}>
        <input
          className={s.range}
          type="range"
          min={0}
          max={100}
          step={1}
          value={value ?? 0}
          aria-label="Tingkat keyakinan dalam persen"
          onChange={(e) => onChange(item.key, Number(e.target.value))}
        />
        <div className={s.ticks} aria-hidden="true">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>
      <div className={s.confFld}>
        <label htmlFor={`f-${item.key}`}>Tuliskan jawaban anda pada kotak</label>
        <div className={`${s.pct} ${bad ? s.bad : ""}`}>
          <input
            id={`f-${item.key}`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="—"
            aria-invalid={bad || undefined}
            value={value === null ? "" : String(value)}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
              if (digits === "") return onChange(item.key, "");
              // Above 100 is refused: the box keeps the previous value.
              if (Number(digits) <= 100) onChange(item.key, Number(digits));
            }}
          />
          <span aria-hidden="true">%</span>
        </div>
      </div>
    </div>
  );
}
