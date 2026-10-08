"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "./events-client";
import { useReloadStep } from "./use-reload-step";
import s from "./p.module.css";

type Props = {
  /** Time left according to the server when this page was rendered. */
  initialLeftMs: number;
  warningMs: number;
  page: string;
};

function format(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/**
 * Countdown in the header (FSD §6.2). Counts with performance.now() from the
 * server's value, so a wrong device clock does not matter; every page render
 * re-syncs it. At zero it asks the server to apply the time-out (§6.3).
 */
export function Timer({ initialLeftMs, warningMs, page }: Props) {
  const reload = useReloadStep();
  const [left, setLeft] = useState(initialLeftMs);
  const expiredSent = useRef(false);

  useEffect(() => {
    const start = performance.now();
    expiredSent.current = false;
    const tick = () => {
      const now = Math.max(0, initialLeftMs - (performance.now() - start));
      setLeft(now);
      if (now > 0 && now <= warningMs) {
        try {
          if (!sessionStorage.getItem("tx_warn_sent")) {
            sessionStorage.setItem("tx_warn_sent", "1");
            track("timer_warning");
          }
        } catch {
          // ignore
        }
      }
      if (now <= 0 && !expiredSent.current) {
        expiredSent.current = true;
        void fetch("/api/p/advance", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ from: page, reason: "timer_expired" }),
        })
          .catch(() => undefined)
          .finally(reload);
      }
    };
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [initialLeftMs, warningMs, page, reload]);

  const warn = left <= warningMs;
  return (
    <div
      className={`${s.timer} ${warn ? s.timerWarn : ""}`}
      role="timer"
      aria-label={`Sisa waktu ${format(left)}`}
    >
      <span>
        <span className={s.brandLong}>
          {warn ? `Sisa waktu kurang dari ${Math.round(warningMs / 60_000)} menit` : "Sisa waktu"}
        </span>
        <span className={s.brandShort}>Sisa</span>
      </span>
      <strong>{format(left)}</strong>
    </div>
  );
}
