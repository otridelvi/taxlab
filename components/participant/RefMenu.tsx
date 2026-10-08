"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { REF_LABELS } from "@/content/text";
import { startRef, stopRef, type CloseReason } from "./reading";
import s from "./p.module.css";

/**
 * Menu "Berkas penugasan" (PRD P-70–P-73): Fakta Klien, Berita Acara, Memo (+ Reviu Atasan
 * in round 2) open in a side panel (desktop) or full screen (phone) without leaving the
 * page. The documents are rendered on the server for the participant's cell and handed over
 * here as ready-made elements, so the cell never reaches the browser.
 */
export type RefKey = "facts" | "minutes" | "memo" | "review";
type Open = "menu" | RefKey | null;

type Ctx = {
  keys: readonly RefKey[];
  docs: Partial<Record<RefKey, ReactNode>>;
  open: Open;
  openDoc: (key: RefKey) => void;
  openMenu: () => void;
  close: () => void;
};

const RefContext = createContext<Ctx | null>(null);

function useRef_() {
  const ctx = useContext(RefContext);
  if (!ctx) throw new Error("RefMenu parts must be rendered inside <RefProvider>");
  return ctx;
}

const ICONS: Record<RefKey | "folder" | "x", string> = {
  facts: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  minutes: "M6 4h12v17H6zM9 4V3h6v1M9 10h6M9 14h6M9 18h3",
  memo: "M3 5h18v14H3zM3 6l9 7 9-7",
  review: "M4 20h4l11-11-4-4L4 16zM13 7l4 4",
  folder: "M3 6.5h6l2 2h10v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z",
  x: "M6 6l12 12M18 6L6 18",
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

export function RefProvider({
  keys,
  docs,
  children,
}: {
  keys: readonly RefKey[];
  docs: Partial<Record<RefKey, ReactNode>>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState<Open>(null);
  const current = useRef<Open>(null);

  const change = useCallback((next: Open, reason: CloseReason) => {
    const prev = current.current;
    if (prev && prev !== "menu") stopRef(next && next !== "menu" ? "switch" : reason);
    if (next && next !== "menu") startRef(next);
    current.current = next;
    setOpen(next);
  }, []);

  // Leaving the page with a file open: close it in the event log.
  useEffect(() => () => stopRef("leave"), []);

  const value: Ctx = {
    keys,
    docs,
    open,
    openDoc: (key) => change(key, "toggle"),
    openMenu: () => change("menu", "toggle"),
    close: () => change(null, "toggle"),
  };
  return (
    <RefContext.Provider value={value}>
      {children}
      <RefPanel />
    </RefContext.Provider>
  );
}

/** Desktop: a bar of buttons above the content. Hidden on phones (the header button replaces it). */
export function RefBar() {
  const { keys, open, openDoc } = useRef_();
  return (
    <nav className={s.refbar} aria-label="Berkas penugasan">
      <span className={s.refbarLabel}>Berkas penugasan</span>
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          className={`${s.refbtn} ${s.refbtnBar} ${open === k ? s.refbtnOn : ""}`}
          aria-haspopup="dialog"
          onClick={() => openDoc(k)}
        >
          <Icon name={k} />
          {REF_LABELS[k]}
        </button>
      ))}
      <small>Dibuka di panel samping tanpa meninggalkan halaman</small>
    </nav>
  );
}

/** Phone: "Berkas" button in the header sub bar. */
export function RefButton() {
  const { openMenu } = useRef_();
  return (
    <button type="button" className={s.berkas} aria-haspopup="dialog" onClick={openMenu}>
      <Icon name="folder" />
      Berkas
    </button>
  );
}

function RefPanel() {
  const { keys, docs, open, openDoc, openMenu, close } = useRef_();
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const isOpen = open !== null;

  useEffect(() => {
    if (!isOpen) return;
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      trigger.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      // Keep Tab inside the dialog.
      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  if (!open) return null;
  const title = open === "menu" ? "Berkas penugasan" : REF_LABELS[open];
  return (
    <>
      <button type="button" className={s.scrim} aria-label="Tutup berkas" tabIndex={-1} onClick={close} />
      <div ref={panel} className={s.drawer} role="dialog" aria-modal="true" aria-label={title}>
        <div className={s.dhead}>
          <b>{title}</b>
          <div className={s.dheadBtns}>
            {open !== "menu" && (
              <button type="button" className={`${s.xbtn} ${s.backList}`} onClick={openMenu}>
                Daftar berkas
              </button>
            )}
            <button ref={closeBtn} type="button" className={s.xbtn} onClick={close}>
              <Icon name="x" />
              Tutup
            </button>
          </div>
        </div>
        {open === "menu" ? (
          <div className={s.dbody}>
            <div className={s.kick} style={{ marginBottom: 12 }}>
              Pilih berkas untuk dibaca
            </div>
            <nav className={s.refnav}>
              {keys.map((k) => (
                <button key={k} type="button" className={s.refbtn} onClick={() => openDoc(k)}>
                  <Icon name={k} />
                  {REF_LABELS[k]}
                </button>
              ))}
            </nav>
          </div>
        ) : (
          <div className={`${s.dbody} ${s.doc}`}>{docs[open]}</div>
        )}
      </div>
    </>
  );
}
