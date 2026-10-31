"use client";

import { formatRupiah, parseRupiah, type IntegerItem } from "@/lib/items";
import type { FieldsProps } from "./Fields";
import s from "./p.module.css";

/**
 * Recommendation: one amount in Rupiah per account (PRD P-82). Digits only,
 * thousands separators added while typing, numeric keyboard on phones; the
 * total is calculated on screen and not stored.
 */
export function MoneyFields({ items, values, missing, onChange }: FieldsProps) {
  const fields = items.filter((i): i is IntegerItem => i.type === "integer");
  const amount = (key: string) => {
    const v = values[key];
    return typeof v === "number" ? v : null;
  };
  const total = fields.reduce((sum, f) => sum + (amount(f.key) ?? 0), 0);

  return (
    <div className={s.moneyList}>
      {fields.map((f) => {
        const bad = missing.includes(f.key);
        const value = amount(f.key);
        return (
          <div key={f.key} className={s.money}>
            <label htmlFor={`f-${f.key}`}>{f.label ?? f.name}</label>
            <div className={`${s.affix} ${bad ? s.bad : ""}`}>
              <span aria-hidden="true">Rp</span>
              <input
                id={`f-${f.key}`}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                aria-invalid={bad || undefined}
                value={value === null ? "" : formatRupiah(value)}
                onChange={(e) => {
                  // Letters and signs are dropped, so only whole non-negative amounts exist.
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 13);
                  onChange(f.key, digits ? parseRupiah(digits) : "");
                }}
              />
            </div>
          </div>
        );
      })}
      <div className={s.total}>
        <b>Total</b>
        <output aria-live="polite">Rp{formatRupiah(total)}</output>
      </div>
    </div>
  );
}
