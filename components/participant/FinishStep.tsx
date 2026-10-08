"use client";

import { useEffect, useState } from "react";
import { P_MESSAGES } from "@/lib/participant-messages";
import { flushEvents, setCurrentPage, track } from "./events-client";
import { useReloadStep } from "./use-reload-step";
import s from "./p.module.css";

/** Last step: "Survey Selesai" ends the session (FSD N-6). */
export function FinishStep() {
  const reload = useReloadStep();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    if (setCurrentPage("finish")) track("page_view", "finish");
  }, []);

  async function finish() {
    setBusy(true);
    setMessage("");
    try {
      await flushEvents(); // the session ends below; send what is left first
      const res = await fetch("/api/p/finish", { method: "POST" });
      if (res.ok) {
        try {
          sessionStorage.clear();
        } catch {
          // ignore
        }
        setDone(true);
        return;
      }
      if (res.status === 409 || res.status === 401) return reload();
      setMessage(P_MESSAGES.server);
    } catch {
      setMessage(P_MESSAGES.network);
    }
    setBusy(false);
  }

  return (
    <article className={`${s.sheet} ${s.ui}`}>
      {done ? (
        <div className={s.done} role="status">
          <div className={s.kick}>Tersimpan</div>
          <h1 className={s.title}>Terima kasih</h1>
          <p>Jawaban anda telah tersimpan dan sesi telah berakhir. Anda boleh menutup halaman ini.</p>
        </div>
      ) : (
        <div className={s.done}>
          <div className={s.kick}>Penutup</div>
          <h1 className={s.title}>Selamat, anda telah menyelesaikan pekerjaan anda.</h1>
          <p style={{ margin: "0 auto 28px" }}>
            Silakan klik tombol <strong>“Survey Selesai”</strong> untuk menyimpan dan mengakhiri sesi.
          </p>
          <button
            type="button"
            className={s.btn}
            style={{ minWidth: 240 }}
            onClick={() => void finish()}
            disabled={busy}
          >
            Survey Selesai
          </button>
          {message && (
            <p className={s.err} role="alert" style={{ marginTop: 12 }}>
              {message}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
