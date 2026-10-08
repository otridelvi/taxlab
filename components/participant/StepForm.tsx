"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { missingItems, missingMessage, type ItemSpec, type ItemValues } from "@/lib/items";
import { P_MESSAGES } from "@/lib/participant-messages";
import { flushEvents, setCurrentPage, track } from "./events-client";
import { useReloadStep } from "./use-reload-step";
import s from "./p.module.css";

type Props = {
  page: string;
  items: ItemSpec[];
  initial: ItemValues;
  nextLabel: string;
  footNote?: string;
  fieldsTitle?: string;
  fieldsIntro?: string;
  children: ReactNode;
};

const AUTOSAVE_DELAY_MS = 800;
const MAX_RETRY_DELAY_MS = 30_000;

function backupKey(page: string) {
  return `tx_draft_${page}`;
}

function readBackup(page: string): ItemValues | null {
  try {
    return JSON.parse(sessionStorage.getItem(backupKey(page)) ?? "null");
  } catch {
    return null;
  }
}

function writeBackup(page: string, values: ItemValues | null) {
  try {
    if (values) sessionStorage.setItem(backupKey(page), JSON.stringify(values));
    else sessionStorage.removeItem(backupKey(page));
  } catch {
    // Storage blocked: autosave still works, only the offline backup is lost.
  }
}

/**
 * One step: server-rendered content (children), the step's items, autosave
 * (FSD §8.2) and the Next button (FSD §7.2). Keyed by page, so it remounts per step.
 */
export function StepForm({
  page,
  items,
  initial,
  nextLabel,
  footNote,
  fieldsTitle,
  fieldsIntro,
  children,
}: Props) {
  const reload = useReloadStep();
  const router = useRouter();
  const retrySave = useRef<() => void>(() => undefined);
  const [values, setValues] = useState<ItemValues>(initial);
  const valuesRef = useRef<ItemValues>(initial);
  const dirty = useRef(new Set<string>());
  const saveTimer = useRef<number | undefined>(undefined);
  const retries = useRef(0);
  const [saveFailing, setSaveFailing] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const save = useCallback(async () => {
    window.clearTimeout(saveTimer.current);
    if (dirty.current.size === 0) return;
    const keys = [...dirty.current];
    dirty.current.clear();
    const body = Object.fromEntries(keys.map((k) => [k, valuesRef.current[k] ?? ""]));
    try {
      const res = await fetch("/api/p/responses", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ page, items: body }),
      });
      if (res.status === 409 || res.status === 401) return reload();
      if (!res.ok && res.status !== 422) throw new Error(String(res.status));
      retries.current = 0;
      setSaveFailing(false);
      if (dirty.current.size === 0) writeBackup(page, null);
    } catch {
      for (const k of keys) dirty.current.add(k);
      retries.current += 1;
      setSaveFailing(true);
      if (retries.current === 3) track("autosave_failed", page);
      const delay = Math.min(2000 * 2 ** (retries.current - 1), MAX_RETRY_DELAY_MS);
      saveTimer.current = window.setTimeout(() => retrySave.current(), delay);
    }
  }, [page, reload]);

  useEffect(() => {
    retrySave.current = () => void save();
  }, [save]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (setCurrentPage(page)) track("page_view", page);
    // Answers typed while offline in an earlier visit: send them, then show the server's values.
    const backup = readBackup(page);
    if (backup && Object.keys(backup).length) {
      void fetch("/api/p/responses", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ page, items: backup }),
      })
        .then((res) => {
          if (res.ok) {
            writeBackup(page, null);
            reload();
          }
        })
        .catch(() => undefined);
    }
    return () => window.clearTimeout(saveTimer.current);
  }, [page, reload]);

  function change(key: string, value: unknown) {
    const next = { ...valuesRef.current, [key]: value };
    valuesRef.current = next;
    setValues(next);
    dirty.current.add(key);
    writeBackup(page, Object.fromEntries([...dirty.current].map((k) => [k, next[k]])));
    if (missing.includes(key)) setMissing((m) => m.filter((x) => x !== key));
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void save(), AUTOSAVE_DELAY_MS);
  }

  async function next() {
    const lacking = missingItems(items, valuesRef.current);
    if (lacking.length) {
      setMissing(lacking);
      setMessage(missingMessage(items, lacking));
      return;
    }
    window.clearTimeout(saveTimer.current);
    setBusy(true);
    setMessage("");
    const payload = Object.fromEntries(items.map((i) => [i.key, valuesRef.current[i.key]]));
    try {
      const res = await fetch("/api/p/advance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ from: page, items: payload }),
      });
      if (res.ok || res.status === 409) {
        dirty.current.clear();
        writeBackup(page, null);
        void flushEvents();
        return reload();
      }
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const err = (await res.json().catch(() => null))?.error;
      if (res.status === 422 && Array.isArray(err?.missing)) {
        setMissing(err.missing);
        setMessage(missingMessage(items, err.missing));
      } else {
        setMessage(err?.message ?? P_MESSAGES.server);
      }
      setBusy(false);
    } catch {
      setMessage(P_MESSAGES.network);
      setBusy(false);
    }
  }

  return (
    <>
      {children}
      {items.length > 0 && (
        <section className={`${s.sheet} ${s.ui}`} aria-label={fieldsTitle}>
          {fieldsTitle && <h2 className={s.h2}>{fieldsTitle}</h2>}
          {fieldsIntro && (
            <p className={s.muted} style={{ margin: "0 0 20px" }}>
              {fieldsIntro}
            </p>
          )}
          <Fields items={items} values={values} missing={missing} onChange={change} />
        </section>
      )}
      <div className={s.foot}>
        {footNote ? <span className={s.muted}>{footNote}</span> : <span />}
        <div className={s.footRight}>
          {saveFailing && (
            <span className={s.saveState} role="status">
              {P_MESSAGES.saving}
            </span>
          )}
          {message && (
            <p className={s.err} role="alert">
              {message}
            </p>
          )}
          <button type="button" className={s.btn} onClick={() => void next()} disabled={busy}>
            {nextLabel}
          </button>
        </div>
      </div>
    </>
  );
}

function Fields({
  items,
  values,
  missing,
  onChange,
}: {
  items: ItemSpec[];
  values: ItemValues;
  missing: string[];
  onChange: (key: string, value: unknown) => void;
}) {
  const choices = items.filter((i) => i.type === "choice");
  const texts = items.filter((i) => i.type !== "choice");
  return (
    <>
      {choices.map((item) => {
        const bad = missing.includes(item.key);
        return (
          <fieldset key={item.key} className={`${s.q} ${bad ? s.qBad : ""}`}>
            <legend dangerouslySetInnerHTML={{ __html: item.legend }} />
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
