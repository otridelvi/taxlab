"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import ui from "@/components/admin/ui.module.css";

/** Reset a broken session (technical problems only, D6). Reason + retyped code, then archive and clear. */
export function ResetSession({ id, code }: { id: string; code: string }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open() {
    setReason("");
    setConfirmCode("");
    setError(null);
    dialogRef.current?.showModal();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 10) {
      setError("Alasan minimal 10 karakter.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/participants/${id}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, confirmCode }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message ?? "Terjadi kesalahan. Coba lagi.");
        return;
      }
      dialogRef.current?.close();
      router.refresh();
    } catch {
      setError("Gagal menghubungi server. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" className={ui.buttonDanger} onClick={open}>
        Reset sesi
      </button>
      <dialog ref={dialogRef} className={ui.dialog} aria-labelledby={`reset-${id}`}>
        <form onSubmit={submit} style={{ whiteSpace: "normal", textAlign: "left" }}>
          <div className={ui.cardHead}>
            <h2 id={`reset-${id}`}>Reset sesi {code}?</h2>
          </div>
          <div className={ui.dialogBody}>
            <p style={{ margin: 0 }}>
              Hanya untuk masalah teknis. Jawaban dan event partisipan diarsipkan, lalu partisipan kembali ke
              Belum mulai di sel yang sama dan harus mengerjakan dari awal. Data kontak tidak berubah.
            </p>
            <div className={ui.field}>
              <label htmlFor={`reset-reason-${id}`}>Alasan (wajib, 10–300 karakter)</label>
              <textarea
                id={`reset-reason-${id}`}
                rows={3}
                maxLength={300}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="mis. ponsel mati di tengah sesi dan data tidak bisa dipulihkan"
              />
            </div>
            <div className={ui.field}>
              <label htmlFor={`reset-code-${id}`}>Ketik ulang kode untuk konfirmasi</label>
              <input
                id={`reset-code-${id}`}
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                placeholder={code}
                autoComplete="off"
                style={{ width: "100%" }}
              />
            </div>
            {error ? (
              <p className={ui.error} role="alert">
                {error}
              </p>
            ) : null}
            <p className={ui.muted} style={{ margin: 0, fontSize: 13 }}>
              Tindakan ini dicatat di Audit log.
            </p>
          </div>
          <div className={ui.dialogFoot}>
            <button type="button" className={ui.buttonSecondary} onClick={() => dialogRef.current?.close()}>
              Batal
            </button>
            <button type="submit" className={ui.buttonDanger} disabled={pending || confirmCode.trim().length === 0}>
              {pending ? "Mereset…" : "Reset sesi"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
