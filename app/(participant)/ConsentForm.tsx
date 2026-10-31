"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { P_MESSAGES } from "@/lib/participant-messages";
import s from "@/components/participant/p.module.css";

export function ConsentForm({ code }: { code: string }) {
  const router = useRouter();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/p/consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agree: true }),
      });
      if (!res.ok) throw new Error(String(res.status));
      router.push(code ? `/login?code=${encodeURIComponent(code)}` : "/login");
    } catch {
      setMessage(P_MESSAGES.network);
      setBusy(false);
    }
  }

  return (
    <>
      <label className={s.check}>
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>
          Saya telah membaca informasi di atas dan <strong>bersedia berpartisipasi</strong> dalam penelitian
          ini.
        </span>
      </label>
      <div className={s.foot}>
        <span className={s.muted}>{agree ? "" : "Centang pernyataan di atas untuk melanjutkan."}</span>
        <div className={s.footRight}>
          {message && (
            <p className={s.err} role="alert">
              {message}
            </p>
          )}
          <button type="button" className={s.btn} disabled={!agree || busy} onClick={() => void submit()}>
            Setuju dan masuk
          </button>
        </div>
      </div>
    </>
  );
}
