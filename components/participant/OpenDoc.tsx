"use client";

import { useState } from "react";
import { flushEvents, track } from "./events-client";
import { useReloadStep } from "./use-reload-step";
import s from "./p.module.css";

/**
 * "Buka memo" / "Buka reviu" (flow B, PLAN-05 D-3). Logs `doc_open`, waits until the event is
 * on the server, then shows the step again: the server now renders the open document.
 */
export function OpenDocButton({ target, label }: { target: "memo" | "review"; label: string }) {
  const reload = useReloadStep();
  const [busy, setBusy] = useState(false);

  async function open() {
    setBusy(true);
    track("doc_open", target);
    await flushEvents();
    reload();
    // If the event could not be sent (offline), let the participant try again.
    window.setTimeout(() => setBusy(false), 4000);
  }

  return (
    <button type="button" className={s.btn} onClick={() => void open()} disabled={busy}>
      {label}
    </button>
  );
}
