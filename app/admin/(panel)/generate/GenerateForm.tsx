"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import shell from "@/components/admin/admin.module.css";
import ui from "@/components/admin/ui.module.css";
import { CELLS, previewAllocation, type Cell, type CompletedPerCell } from "@/lib/allocate";
import { CELL_LABELS } from "@/lib/dashboard";
import { loginLink } from "@/lib/participants";
import styles from "./generate.module.css";

type Result = { batchId: string; label: string | null; codes: string[] };

export function GenerateForm(props: {
  completed: CompletedPerCell;
  total: CompletedPerCell;
  initialMode: "random" | "manual";
  initialCell: Cell;
  baseUrl: string;
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState("8");
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState(props.initialMode);
  const [cell, setCell] = useState<Cell>(props.initialCell);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const n = Number(quantity);
  const validQuantity = Number.isInteger(n) && n >= 1 && n <= 200;
  const preview = previewAllocation(validQuantity ? n : 0, mode, cell, props.completed);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!validQuantity) {
      setError("Jumlah kode harus 1–200.");
      return;
    }
    setPending(true);
    setError(null);
    setCopied(null);
    try {
      const res = await fetch("/api/admin/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: n, label, mode, cell: mode === "manual" ? cell : null }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message ?? "Gagal membuat kode. Tidak ada kode yang tersimpan. Coba lagi.");
        return;
      }
      setResult({ batchId: body.batch_id, label: body.label, codes: body.codes });
      router.refresh();
    } catch {
      setError("Gagal menghubungi server. Periksa koneksi lalu coba lagi.");
    } finally {
      setPending(false);
    }
  }

  async function copyLinks() {
    if (!result) return;
    const text = result.codes.map((c) => loginLink(props.baseUrl, c)).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(`${result.codes.length} link masuk disalin ke clipboard.`);
    } catch {
      setCopied("Clipboard tidak bisa diakses. Gunakan Download CSV.");
    }
  }

  return (
    <>
      <div className={styles.grid}>
        <section className={shell.card} aria-labelledby="form-title">
          <div className={ui.cardHead}>
            <h2 id="form-title">Batch baru</h2>
          </div>
          <form className={ui.body} onSubmit={submit} noValidate>
            <div className={`${ui.field} ${styles.row}`}>
              <label htmlFor="quantity">Jumlah kode</label>
              <input
                id="quantity"
                name="quantity"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.replace(/\D/g, "").slice(0, 3))}
                style={{ width: 140 }}
                aria-describedby="quantity-help"
              />
              <small id="quantity-help">
                1–200 per batch. Untuk satu kelas: jumlah mahasiswa + beberapa cadangan.
              </small>
            </div>
            <div className={`${ui.field} ${styles.row}`}>
              <label htmlFor="label">Label batch</label>
              <input
                id="label"
                name="label"
                maxLength={60}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="mis. Kelas Perpajakan A, Okt 2026"
                style={{ width: "100%" }}
              />
              <small>Opsional, maks. 60 karakter.</small>
            </div>
            <fieldset className={`${ui.field} ${styles.row} ${styles.fieldset}`}>
              <legend>Penugasan sel</legend>
              <div className={styles.modes}>
                <label className={mode === "random" ? `${styles.mode} ${styles.modeOn}` : styles.mode}>
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === "random"}
                    onChange={() => setMode("random")}
                  />
                  <span>
                    <b>Acak berimbang</b>
                    <span>Disarankan. Blok acak per 4 kode; jumlah per sel selisih maksimal 1.</span>
                  </span>
                </label>
                <label className={mode === "manual" ? `${styles.mode} ${styles.modeOn}` : styles.mode}>
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === "manual"}
                    onChange={() => setMode("manual")}
                  />
                  <span>
                    <b>Pilih sel manual</b>
                    <span>Semua kode di batch ini masuk ke satu sel.</span>
                  </span>
                </label>
              </div>
            </fieldset>
            {mode === "manual" ? (
              <div className={`${ui.field} ${styles.row}`}>
                <label htmlFor="cell">Sel tujuan</label>
                <select id="cell" value={cell} onChange={(e) => setCell(Number(e.target.value) as Cell)}>
                  {CELLS.map((c) => (
                    <option key={c} value={c}>
                      Sel {c} · {CELL_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {error ? (
              <p className={ui.error} role="alert" style={{ marginBottom: 16 }}>
                {error}
              </p>
            ) : null}
            <div className={styles.submitRow}>
              <button type="submit" className={ui.button} disabled={pending}>
                {pending ? "Membuat kode…" : `Generate ${validQuantity ? n : ""} kode`}
              </button>
              <span className={ui.muted} style={{ fontSize: 13 }}>
                Kode tidak menyertakan informasi sel.
              </span>
            </div>
          </form>
        </section>

        <section className={shell.card} aria-labelledby="preview-title">
          <div className={ui.cardHead}>
            <h2 id="preview-title">Pratinjau distribusi</h2>
          </div>
          <table className={ui.table}>
            <thead>
              <tr>
                <th scope="col">Sel</th>
                <th scope="col" className={ui.num}>
                  Saat ini
                </th>
                <th scope="col" className={ui.num}>
                  Tambahan
                </th>
                <th scope="col" className={ui.num}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {CELLS.map((c) => (
                <tr key={c}>
                  <td>
                    Sel {c} · {CELL_LABELS[c]}
                  </td>
                  <td className={ui.num}>{props.total[c]}</td>
                  <td className={`${ui.num} ${ui.mono}`} style={{ color: "var(--color-accent)" }}>
                    +{preview[c]}
                  </td>
                  <td className={ui.num}>
                    <b>{props.total[c] + preview[c]}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={`${ui.muted} ${styles.previewNote}`}>
            Pada mode acak, sisa pembagian diberikan ke sel dengan jumlah selesai paling sedikit.
          </p>
        </section>
      </div>

      {result ? (
        <section className={shell.card} aria-labelledby="result-title">
          <div className={ui.cardHead}>
            <h2 id="result-title">
              Hasil generate{result.label ? ` · ${result.label}` : ""} · {result.codes.length} kode
            </h2>
          </div>
          <div className={ui.body} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p className={ui.toast} role="status">
              {result.codes.length} kode berhasil dibuat{result.label ? ` di batch "${result.label}"` : ""}.
            </p>
            <ul className={styles.codes} aria-label="Kode akses">
              {result.codes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <div className={styles.submitRow}>
              <a
                className={ui.button}
                href={`/admin/print/batches/${result.batchId}`}
                target="_blank"
                rel="noopener"
              >
                Cetak kartu kode
              </a>
              <a
                className={ui.buttonSecondary}
                href={`/api/admin/batches/${result.batchId}/codes?format=csv`}
              >
                Download CSV
              </a>
              <a
                className={ui.buttonSecondary}
                href={`/api/admin/batches/${result.batchId}/codes?format=xlsx`}
              >
                Download XLSX
              </a>
              <button type="button" className={ui.buttonSecondary} onClick={copyLinks}>
                Salin semua link masuk
              </button>
            </div>
            {copied ? (
              <p className={ui.muted} role="status" style={{ margin: 0, fontSize: 14 }}>
                {copied}
              </p>
            ) : null}
            <p className={ui.note} style={{ margin: 0 }}>
              Kartu dan file berisi kode, label batch dan link masuk. <b>Sel tidak ikut</b>, sehingga aman
              dibagikan di kelas.
            </p>
          </div>
        </section>
      ) : null}
    </>
  );
}
