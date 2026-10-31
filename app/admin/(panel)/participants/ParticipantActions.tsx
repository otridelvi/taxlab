"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import ui from "@/components/admin/ui.module.css";
import { CELL_LABELS } from "@/lib/dashboard";

type Kind = "cell" | "deactivate";

/** "Ubah sel" and "Nonaktifkan" for a not_started participant (FSD-Admin §6.3). */
export function ParticipantActions(props: {
  id: string;
  code: string;
  cell: number;
  canChangeCell: boolean;
  canDeactivate: boolean;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<Kind>("cell");
  const [newCell, setNewCell] = useState(props.cell === 1 ? 2 : 1);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!props.canChangeCell && !props.canDeactivate) return null;

  function open(k: Kind) {
    setKind(k);
    setReason("");
    setError(null);
    setNewCell(props.cell === 1 ? 2 : 1);
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
      const url = `/api/admin/participants/${props.id}/${kind === "cell" ? "cell" : "deactivate"}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kind === "cell" ? { cell: newCell, reason } : { reason }),
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

  const title = kind === "cell" ? `Ubah sel ${props.code}` : `Nonaktifkan kode ${props.code}?`;

  return (
    <div className={ui.actions}>
      {props.canChangeCell ? (
        <button type="button" className={ui.linkButton} onClick={() => open("cell")}>
          Ubah sel
        </button>
      ) : null}
      {props.canDeactivate ? (
        <button type="button" className={ui.linkButton} onClick={() => open("deactivate")}>
          Nonaktifkan
        </button>
      ) : null}

      <dialog ref={dialogRef} className={ui.dialog} aria-labelledby={`dlg-${props.id}`}>
        <form onSubmit={submit} style={{ whiteSpace: "normal", textAlign: "left" }}>
          <div className={ui.cardHead}>
            <h2 id={`dlg-${props.id}`}>{title}</h2>
          </div>
          <div className={ui.dialogBody}>
            {kind === "cell" ? (
              <div className={ui.field}>
                <label htmlFor={`cell-${props.id}`}>Sel baru</label>
                <select
                  id={`cell-${props.id}`}
                  value={newCell}
                  onChange={(e) => setNewCell(Number(e.target.value))}
                  style={{ width: "100%" }}
                >
                  {[1, 2, 3, 4].map((c) => (
                    <option key={c} value={c} disabled={c === props.cell}>
                      Sel {c} · {CELL_LABELS[c]}
                      {c === props.cell ? " (saat ini)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p style={{ margin: 0 }}>
                Kode yang dinonaktifkan tidak bisa dipakai masuk dan tidak bisa diaktifkan kembali. Data tidak
                dihapus.
              </p>
            )}
            <div className={ui.field}>
              <label htmlFor={`reason-${props.id}`}>Alasan (wajib, 10–300 karakter)</label>
              <textarea
                id={`reason-${props.id}`}
                rows={3}
                maxLength={300}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="mis. kode tertukar saat dibagikan di kelas"
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
            <button
              type="submit"
              className={kind === "cell" ? ui.button : ui.buttonDanger}
              disabled={pending}
            >
              {pending ? "Menyimpan…" : kind === "cell" ? "Simpan perubahan" : "Nonaktifkan"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
