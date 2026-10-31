"use client";

import { useEffect, useMemo, useState } from "react";
import shell from "@/components/admin/admin.module.css";
import ui from "@/components/admin/ui.module.css";
import { ALL_CELLS, DEFAULT_FILTER, filterToParams, type ExportFilter } from "@/lib/export/filter";
import { STATUSES, STATUS_LABELS } from "@/lib/participants";
import styles from "./export.module.css";

type Batch = { id: string; label: string | null };

export function ExportPanel({
  batches,
  canContacts,
  canDeleteContacts = false,
}: {
  batches: Batch[];
  canContacts: boolean;
  canDeleteContacts?: boolean;
}) {
  const [filter, setFilter] = useState<ExportFilter>(DEFAULT_FILTER);
  const [count, setCount] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [delBatch, setDelBatch] = useState("");
  const [delConfirm, setDelConfirm] = useState("");
  const [delBusy, setDelBusy] = useState(false);
  const [delMessage, setDelMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function deleteContacts(event: React.FormEvent) {
    event.preventDefault();
    setDelBusy(true);
    setDelMessage(null);
    try {
      const res = await fetch("/api/admin/contacts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: delConfirm, batchId: delBatch || null }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setDelMessage({ ok: false, text: body?.error?.message ?? "Terjadi kesalahan. Coba lagi." });
        return;
      }
      setDelConfirm("");
      setDelMessage({ ok: true, text: `${body.deleted} data kontak dihapus.` });
    } catch {
      setDelMessage({ ok: false, text: "Gagal menghubungi server. Coba lagi." });
    } finally {
      setDelBusy(false);
    }
  }

  const query = useMemo(() => filterToParams(filter).toString(), [filter]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/export/count?${query}`, { signal: controller.signal });
        if (!res.ok) throw new Error("count");
        setCount(((await res.json()) as { count: number }).count);
        setFailed(false);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setFailed(true);
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  const set = (patch: Partial<ExportFilter>) => setFilter((f) => ({ ...f, ...patch }));

  const empty = count === 0 || filter.cells.length === 0 || filter.statuses.length === 0;
  const linkClass = (primary: boolean) => `${primary ? ui.button : ui.buttonSecondary} ${empty ? styles.disabled : ""}`;

  async function downloadContacts() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/export/contacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filter: Object.fromEntries(filterToParams(filter)), acknowledged: true }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        setError(body?.error?.message ?? "Gagal mengunduh data kontak. Coba lagi.");
        return;
      }
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "kontak.xlsx";
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Gagal mengunduh data kontak. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className={shell.card} aria-label="Filter export">
        <div className={ui.cardHead}>
          <h2>Filter</h2>
          <span>Berlaku untuk semua export di bawah</span>
        </div>
        <div className={ui.filters}>
          <fieldset className={`${styles.checks} ${ui.field}`}>
            <legend>Sel</legend>
            {ALL_CELLS.map((c) => (
              <label key={c}>
                <input
                  type="checkbox"
                  checked={filter.cells.includes(c)}
                  onChange={() => set({ cells: toggle(filter.cells, c).sort() })}
                />
                Sel {c}
              </label>
            ))}
          </fieldset>
          <fieldset className={`${styles.checks} ${ui.field}`}>
            <legend>Status</legend>
            {STATUSES.map((s) => (
              <label key={s}>
                <input
                  type="checkbox"
                  checked={filter.statuses.includes(s)}
                  onChange={() => set({ statuses: toggle(filter.statuses, s) })}
                />
                {STATUS_LABELS[s]}
              </label>
            ))}
          </fieldset>
          <div className={ui.field}>
            <label htmlFor="exp-batch">Batch</label>
            <select id="exp-batch" value={filter.batch ?? ""} onChange={(e) => set({ batch: e.target.value || null })}>
              <option value="">Semua batch</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label ?? "Tanpa label"}
                </option>
              ))}
            </select>
          </div>
          <div className={ui.field}>
            <label htmlFor="exp-from">Mulai dari</label>
            <input id="exp-from" type="date" value={filter.from ?? ""} onChange={(e) => set({ from: e.target.value || null })} />
          </div>
          <div className={ui.field}>
            <label htmlFor="exp-to">Sampai</label>
            <input id="exp-to" type="date" value={filter.to ?? ""} onChange={(e) => set({ to: e.target.value || null })} />
          </div>
        </div>
        <p className={styles.count} role="status" aria-live="polite">
          {failed ? (
            "Jumlah partisipan tidak bisa dihitung. Coba ubah filter."
          ) : filter.cells.length === 0 || filter.statuses.length === 0 ? (
            "Pilih minimal satu sel dan satu status."
          ) : count === null ? (
            "Menghitung…"
          ) : (
            <>
              <strong>{count}</strong> partisipan cocok dengan filter.
            </>
          )}
        </p>
      </section>

      <div className={styles.cards}>
        <section className={shell.card} aria-labelledby="exp-dataset">
          <div className={ui.cardHead}>
            <h2 id="exp-dataset">Dataset utama</h2>
            <span>Satu baris per partisipan (wide)</span>
          </div>
          <div className={styles.cardBody}>
            <p>Siap analisis: waktu baca, peringkat, rekomendasi, perubahan putaran, cek manipulasi, demografi. Tanpa data kontak.</p>
            <div className={styles.buttons}>
              <a className={linkClass(true)} href={`/api/admin/export/dataset?format=xlsx&${query}`} aria-disabled={empty}>
                Unduh XLSX
              </a>
              <a className={linkClass(false)} href={`/api/admin/export/dataset?format=csv&${query}`} aria-disabled={empty}>
                Unduh CSV
              </a>
            </div>
          </div>
        </section>

        <section className={shell.card} aria-labelledby="exp-events">
          <div className={ui.cardHead}>
            <h2 id="exp-events">Event log</h2>
            <span>Satu baris per event (long)</span>
          </div>
          <div className={styles.cardBody}>
            <p>Semua event perilaku mentah: buka kasus, berkas, tab, halaman, timer.</p>
            <div className={styles.buttons}>
              <a className={linkClass(true)} href={`/api/admin/export/events?format=csv&${query}`} aria-disabled={empty}>
                Unduh CSV
              </a>
              <a className={linkClass(false)} href={`/api/admin/export/events?format=xlsx&${query}`} aria-disabled={empty}>
                Unduh XLSX
              </a>
            </div>
          </div>
        </section>

        <section className={shell.card} aria-labelledby="exp-codebook">
          <div className={ui.cardHead}>
            <h2 id="exp-codebook">Codebook</h2>
            <span>Definisi variabel</span>
          </div>
          <div className={styles.cardBody}>
            <p>Nama, kelompok, putaran, deskripsi, tipe, nilai, dan sumber setiap kolom dataset. Tidak terpengaruh filter.</p>
            <div className={styles.buttons}>
              <a className={ui.button} href="/api/admin/export/codebook">
                Unduh XLSX
              </a>
            </div>
          </div>
        </section>

        {canContacts ? (
          <section className={`${shell.card} ${styles.contactCard}`} aria-labelledby="exp-contacts">
            <div className={ui.cardHead}>
              <h2 id="exp-contacts">Data kontak insentif</h2>
              <span>Hanya admin</span>
            </div>
            <div className={styles.cardBody}>
              <p>Kode, batch, status, nama, email, e-wallet, dan No HP. Tidak berisi jawaban penelitian. Setiap unduhan dicatat di audit log.</p>
              <label className={styles.ack}>
                <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
                <span>Saya akan memakai data ini hanya untuk membayar insentif dan tidak menggabungkannya dengan dataset penelitian.</span>
              </label>
              {error ? (
                <p className={ui.error} role="alert">
                  {error}
                </p>
              ) : null}
              <div className={styles.buttons}>
                <button type="button" className={ui.button} disabled={!ack || empty || busy} onClick={downloadContacts}>
                  {busy ? "Menyiapkan…" : "Unduh XLSX"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {canDeleteContacts ? (
          <section className={`${shell.card} ${styles.contactCard}`} aria-labelledby="exp-delete">
            <div className={ui.cardHead}>
              <h2 id="exp-delete">Hapus data kontak</h2>
              <span>Hanya admin</span>
            </div>
            <form className={styles.cardBody} onSubmit={deleteContacts}>
              <p>
                Menghapus nama, email, e-wallet, dan No HP setelah insentif dibayar. Jawaban penelitian tidak
                berubah. Penghapusan tidak bisa dibatalkan dan dicatat di audit log.
              </p>
              <div className={ui.field}>
                <label htmlFor="del-batch">Cakupan</label>
                <select id="del-batch" value={delBatch} onChange={(e) => setDelBatch(e.target.value)}>
                  <option value="">Semua batch</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label ?? "Tanpa label"}
                    </option>
                  ))}
                </select>
              </div>
              <div className={ui.field}>
                <label htmlFor="del-confirm">Ketik HAPUS untuk mengonfirmasi</label>
                <input id="del-confirm" value={delConfirm} onChange={(e) => setDelConfirm(e.target.value)} autoComplete="off" />
              </div>
              {delMessage ? (
                <p className={delMessage.ok ? ui.muted : ui.error} role={delMessage.ok ? "status" : "alert"}>
                  {delMessage.text}
                </p>
              ) : null}
              <div className={styles.buttons}>
                <button type="submit" className={ui.buttonDanger} disabled={delConfirm !== "HAPUS" || delBusy}>
                  {delBusy ? "Menghapus…" : "Hapus data kontak"}
                </button>
              </div>
            </form>
          </section>
        ) : null}
      </div>
    </>
  );
}
