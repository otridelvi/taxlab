import type { ReactNode } from "react";
import { Timer } from "./Timer";
import s from "./p.module.css";

export type TimerInfo =
  | { state: "running"; leftMs: number; warningMs: number; page: string }
  | { state: "done" }
  | { state: "none" };

/** Header before login: study identity only. */
export function StudyShell({ children, slim }: { children: ReactNode; slim?: boolean }) {
  return (
    <div className={s.app}>
      <header className={s.top}>
        <div className={s.topIn}>
          <div className={s.firm}>
            <div className={s.brand}>
              <b>Studi Penyelesaian SPT Tahunan</b>
              <span>Penelitian disertasi · dilaksanakan secara daring</span>
            </div>
          </div>
        </div>
      </header>
      <main className={`${s.narrow} ${slim ? s.slim : ""}`}>{children}</main>
    </div>
  );
}

/** Header after login: fictional firm letterhead, timer, section label (FSD §9.1). */
export function FirmShell({
  section,
  code,
  timer,
  children,
}: {
  section: string;
  code?: string;
  timer: TimerInfo;
  children: ReactNode;
}) {
  return (
    <div className={s.app}>
      <header className={s.top}>
        <div className={s.topIn}>
          <div className={s.firm}>
            <div className={s.mark} aria-hidden="true">
              W&amp;R
            </div>
            <div className={s.brand}>
              <b>
                <span className={s.brandLong}>Wiradana &amp; Rekan · </span>Sistem Penugasan Staf
              </b>
              <span>Klien: PT Cahaya Gama · SPT Tahunan PPh Badan</span>
            </div>
          </div>
          {timer.state === "running" && (
            <Timer initialLeftMs={timer.leftMs} warningMs={timer.warningMs} page={timer.page} />
          )}
          {timer.state === "done" && (
            <div className={s.tag}>
              <span className={s.brandLong}>Penugasan selesai · </span>tanpa batas waktu
            </div>
          )}
        </div>
        <div className={s.sub}>
          <div className={s.subIn}>
            <b>{section}</b>
            {code && (
              <span className={s.subCode}>
                Kode akses <span className={s.code}>{code}</span>
              </span>
            )}
          </div>
        </div>
      </header>
      <main className={s.narrow}>{children}</main>
    </div>
  );
}
