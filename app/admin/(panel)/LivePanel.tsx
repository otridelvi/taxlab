"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import shell from "@/components/admin/admin.module.css";
import ui from "@/components/admin/ui.module.css";
import { durationText } from "@/lib/format";
import { positionLabel } from "@/lib/pages";
import type { LiveRow } from "@/lib/live";

const REFRESH_MS = 30_000;
const time = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Jakarta" });

/** Participants in progress, refreshed every 30 seconds (D-10). */
export function LivePanel({ initial, updatedAt }: { initial: LiveRow[]; updatedAt: string }) {
  const [rows, setRows] = useState(initial);
  const [at, setAt] = useState(updatedAt);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let stopped = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/live", { cache: "no-store" });
        if (!res.ok) throw new Error("live");
        const body = (await res.json()) as { updatedAt: string; rows: LiveRow[] };
        if (stopped) return;
        setRows(body.rows);
        setAt(body.updatedAt);
        setFailed(false);
      } catch {
        if (!stopped) setFailed(true);
      }
    }
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className={shell.card} aria-labelledby="live-title">
      <div className={ui.cardHead}>
        <h2 id="live-title">Sedang mengerjakan</h2>
        <span>
          {failed ? "Gagal memperbarui · mencoba lagi" : `Diperbarui ${time.format(new Date(at))} WIB · tiap 30 detik`}
        </span>
      </div>
      {rows.length === 0 ? (
        <div className={shell.emptyState}>
          <p className={shell.emptyTitle}>Tidak ada partisipan yang sedang mengerjakan.</p>
        </div>
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th scope="col">Kode</th>
                <th scope="col">Sel</th>
                <th scope="col">Posisi</th>
                <th scope="col" className={ui.num}>
                  Sisa waktu
                </th>
                <th scope="col">Terakhir aktif</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} data-testid="live-row">
                  <td className={ui.mono}>
                    <Link href={`/admin/participants/${r.code}`}>{r.code}</Link>
                  </td>
                  <td>Sel {r.cell}</td>
                  <td>{positionLabel(r.page) ?? <span className={ui.muted}>—</span>}</td>
                  <td className={`${ui.num} ${ui.mono}`}>
                    {r.remainingSec === null ? <span className={ui.muted}>—</span> : durationText(r.remainingSec)}
                  </td>
                  <td>
                    {r.inactive ? (
                      <span className={ui.inactive}>Tidak aktif</span>
                    ) : r.lastActiveAt ? (
                      time.format(new Date(r.lastActiveAt))
                    ) : (
                      <span className={ui.muted}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
