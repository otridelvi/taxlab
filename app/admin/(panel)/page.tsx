import Link from "next/link";
import styles from "./dashboard.module.css";
import shell from "@/components/admin/admin.module.css";
import { requireAdmin } from "@/lib/auth/current-admin";
import { can } from "@/lib/auth/roles";
import { CELL_LABELS, computeTotals, findLaggingCells, progressRatio } from "@/lib/dashboard";
import { getBatchCount, getCellSummary, getDashboardSettings } from "@/lib/db/dashboard";

export const metadata = { title: "Dasbor · Taxlab Admin" };

const percent = new Intl.NumberFormat("id-ID", { style: "percent", maximumFractionDigits: 0 });
const updatedAt = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

export default async function DashboardPage() {
  const admin = await requireAdmin();
  const [cells, settings, batchCount] = await Promise.all([
    getCellSummary(),
    getDashboardSettings(),
    getBatchCount(),
  ]);
  const totals = computeTotals(cells, settings.targetPerCell);
  const lagging = findLaggingCells(cells, settings);
  const laggingCells = new Set(lagging.map((l) => l.cell));
  const canGenerate = can(admin.role, "participants:generate");

  return (
    <>
      <div className={shell.pageHead}>
        <div>
          <h1 className={shell.pageTitle}>Dasbor</h1>
          <p className={shell.pageSubtitle}>
            Diperbarui {updatedAt.format(new Date())} WIB · target {settings.targetPerCell} partisipan selesai
            per sel
          </p>
        </div>
        {canGenerate ? (
          <Link className={styles.primaryButton} href="/admin/generate">
            Generate partisipan
          </Link>
        ) : null}
      </div>

      {lagging.map((l) => (
        <div key={l.cell} className={styles.alert} role="status">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M12 3 2 20h20z" />
            <path d="M12 10v4M12 17v.5" />
          </svg>
          <div>
            <b>Jumlah selesai antar sel timpang</b>
            Sel {l.cell} baru {l.completed} partisipan selesai, {l.gapPercent}% di bawah rata-rata (
            {Math.round(l.average)}).
          </div>
        </div>
      ))}

      <section className={shell.card} aria-label="Ringkasan">
        <div className={styles.tiles}>
          <Tile label="Kode dibuat" value={totals.total} note={`${batchCount} batch`} />
          <Tile
            label="Selesai"
            value={totals.completed}
            note={`${percent.format(totals.completedShare)} dari target ${settings.targetPerCell * 4}`}
          />
          <Tile label="Sedang mengerjakan" value={totals.inProgress} note="saat ini" />
          <Tile label="Belum mulai" value={totals.notStarted} note="kode belum dipakai" />
          <Tile label="Waktu habis" value={totals.timedOut} note="tidak selesai" />
        </div>
      </section>

      <section className={shell.card} aria-labelledby="per-cell">
        <div className={styles.cardHead}>
          <h2 id="per-cell">Progres per sel</h2>
          <span>Hanya status Selesai yang dihitung ke target</span>
        </div>
        {totals.total === 0 ? (
          <div className={shell.emptyState}>
            <p className={shell.emptyTitle}>Belum ada kode akses</p>
            <p className={shell.emptyText}>
              {canGenerate ? (
                <>
                  Mulai dengan <Link href="/admin/generate">Generate partisipan</Link>.
                </>
              ) : (
                "Kode akses akan muncul setelah admin membuatnya."
              )}
            </p>
          </div>
        ) : null}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Sel</th>
                <th scope="col">Perlakuan</th>
                <th scope="col" className={styles.num}>
                  Dibuat
                </th>
                <th scope="col" className={styles.num}>
                  Belum mulai
                </th>
                <th scope="col" className={styles.num}>
                  Sedang
                </th>
                <th scope="col" className={styles.num}>
                  Selesai
                </th>
                <th scope="col" className={styles.num}>
                  Waktu habis
                </th>
                <th scope="col">Selesai terhadap target</th>
              </tr>
            </thead>
            <tbody>
              {cells.map((c) => {
                const isLagging = laggingCells.has(c.cell);
                return (
                  <tr key={c.cell}>
                    <td>
                      <b>Sel {c.cell}</b>
                    </td>
                    <td>{CELL_LABELS[c.cell]}</td>
                    <td className={styles.num}>{c.total}</td>
                    <td className={styles.num}>{c.notStarted}</td>
                    <td className={styles.num}>{c.inProgress}</td>
                    <td className={styles.num}>
                      <b>{c.completed}</b>
                    </td>
                    <td className={styles.num}>{c.timedOut}</td>
                    <td>
                      <div className={styles.meter}>
                        <div className={styles.track}>
                          <div
                            className={isLagging ? `${styles.fill} ${styles.fillLow}` : styles.fill}
                            style={{ width: `${progressRatio(c.completed, settings.targetPerCell) * 100}%` }}
                          />
                        </div>
                        <span className={styles.mono}>
                          {c.completed}/{settings.targetPerCell}
                        </span>
                        {isLagging ? (
                          <span className={styles.lagging}>
                            <i aria-hidden="true" />
                            Tertinggal
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Tile({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className={styles.tile}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
