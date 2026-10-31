"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { normalizeAccessCode } from "@/lib/access-code";
import { P_MESSAGES } from "@/lib/participant-messages";
import s from "@/components/participant/p.module.css";

export function LoginForm({ defaultCode }: { defaultCode: string }) {
  const router = useRouter();
  const [code, setCode] = useState(defaultCode);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const normalized = normalizeAccessCode(code);
    if (!normalized) {
      setMessage(P_MESSAGES.invalidFormat);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/p/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: normalized }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok) {
        router.replace(body?.resumed ? "/task?resumed=1" : "/task");
        return;
      }
      if (res.status === 428) {
        router.push(`/?code=${encodeURIComponent(normalized)}`);
        return;
      }
      setMessage(body?.error?.message ?? P_MESSAGES.server);
    } catch {
      setMessage(P_MESSAGES.network);
    }
    setBusy(false);
  }

  return (
    <>
      <form className={`${s.sheet} ${s.ui}`} onSubmit={(e) => void submit(e)} noValidate>
        <div className={s.kick}>Log in</div>
        <h1 className={s.title} style={{ fontSize: 30 }}>
          Masuk dengan kode akses
        </h1>
        <p style={{ margin: "0 0 24px", color: "var(--color-ink-soft)" }}>
          Kode akses diberikan oleh peneliti. Setiap kode hanya berlaku untuk satu orang.
        </p>
        <div className={s.fld}>
          <label htmlFor="code">Kode akses</label>
          <input
            id="code"
            className={s.codeInput}
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="TX-____-____"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-describedby="code-help"
          />
          <small id="code-help">Contoh: TX-7KQ2-M9PA. Huruf besar atau kecil tidak berpengaruh.</small>
        </div>
        {message && (
          <p className={s.err} role="alert" style={{ marginTop: 12 }}>
            {message}
          </p>
        )}
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column" }}>
          <button type="submit" className={s.btn} disabled={busy}>
            Masuk
          </button>
        </div>
      </form>
      <p className={s.muted} style={{ margin: "0 4px" }}>
        Jika sesi anda terputus, masukkan kode yang sama untuk melanjutkan dari halaman terakhir. Sisa waktu
        tetap berjalan.
      </p>
    </>
  );
}
