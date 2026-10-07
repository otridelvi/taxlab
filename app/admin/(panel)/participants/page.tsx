import Link from "next/link";
import { Forbidden } from "@/components/admin/ComingSoon";
import { StatusLabel } from "@/components/admin/StatusLabel";
import shell from "@/components/admin/admin.module.css";
import ui from "@/components/admin/ui.module.css";
import { requireAdmin } from "@/lib/auth/current-admin";
import { can } from "@/lib/auth/roles";
import { CELL_LABELS } from "@/lib/dashboard";
import { listBatches, listParticipants } from "@/lib/db/participants";
import { positionLabel } from "@/lib/pages";
import {
  PAGE_SIZES,
  STATUSES,
  STATUS_LABELS,
  filtersToQuery,
  parseParticipantFilters,
} from "@/lib/participants";
import { ParticipantActions } from "./ParticipantActions";

export const metadata = { title: "Partisipan · Taxlab Admin" };

const dateTime = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

function formatDuration(s: number | null): string | null {
  if (s == null) return null;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

export default async function ParticipantsPage({ searchParams }: PageProps<"/admin/participants">) {
  const admin = await requireAdmin();
  if (!can(admin.role, "participants:view")) return <Forbidden />;

  const filters = parseParticipantFilters(await searchParams);
  const [{ rows, total }, batches] = await Promise.all([listParticipants(filters), listBatches()]);
  const canChangeCell = can(admin.role, "participants:change-cell");
  const canDeactivate = can(admin.role, "participants:deactivate");
  const canGenerate = can(admin.role, "participants:generate");
  const pages = Math.max(1, Math.ceil(total / filters.size));
  const firstRow = total === 0 ? 0 : (filters.page - 1) * filters.size + 1;
  const lastRow = Math.min(total, filters.page * filters.size);
  const filtered = Boolean(filters.q || filters.cells.length || filters.status || filters.batch);

  return (
    <>
      <div className={shell.pageHead}>
        <div>
          <h1 className={shell.pageTitle}>Partisipan</h1>
          <p className={shell.pageSubtitle}>
            {total} kode akses{filtered ? " cocok dengan filter" : ""}
          </p>
        </div>
        {canGenerate ? (
          <Link className={ui.button} href="/admin/generate">
            Generate partisipan
          </Link>
        ) : null}
      </div>

      <section className={shell.card} aria-label="Tabel partisipan">
        <form className={ui.filters} method="get" action="/admin/participants">
          <div className={ui.field} style={{ flex: "1 1 200px" }}>
            <label htmlFor="q">Cari kode</label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={filters.q}
              placeholder="TX-…"
              style={{ width: "100%" }}
            />
          </div>
          <div className={ui.field}>
            <label htmlFor="cell">Sel</label>
            <select
              id="cell"
              name="cell"
              defaultValue={filters.cells.length === 1 ? String(filters.cells[0]) : ""}
            >
              <option value="">Semua sel</option>
              {[1, 2, 3, 4].map((c) => (
                <option key={c} value={c}>
                  Sel {c}
                </option>
              ))}
            </select>
          </div>
          <div className={ui.field}>
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={filters.status ?? ""}>
              <option value="">Semua status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className={ui.field}>
            <label htmlFor="batch">Batch</label>
            <select id="batch" name="batch" defaultValue={filters.batch ?? ""}>
              <option value="">Semua batch</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label ?? "Tanpa label"}
                </option>
              ))}
            </select>
          </div>
          <div className={ui.field}>
            <label htmlFor="sort">Urutkan</label>
            <select id="sort" name="sort" defaultValue={filters.sort}>
              <option value="started_at_desc">Terbaru dimulai</option>
              <option value="created_at_desc">Terbaru dibuat</option>
              <option value="code_asc">Kode A–Z</option>
            </select>
          </div>
          <input type="hidden" name="size" value={filters.size} />
          <button type="submit" className={ui.buttonSecondary}>
            Terapkan
          </button>
          {filtered ? (
            <Link href="/admin/participants" style={{ fontSize: 14, alignSelf: "center" }}>
              Hapus filter
            </Link>
          ) : null}
        </form>

        {rows.length === 0 ? (
          <div className={shell.emptyState}>
            <p className={shell.emptyTitle}>
              {filtered ? "Tidak ada partisipan yang cocok dengan filter." : "Belum ada kode akses."}
            </p>
            <p className={shell.emptyText}>
              {filtered ? (
                <Link href="/admin/participants">Hapus filter</Link>
              ) : canGenerate ? (
                <Link href="/admin/generate">Generate partisipan</Link>
              ) : null}
            </p>
          </div>
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th scope="col">Kode</th>
                  <th scope="col">Sel</th>
                  <th scope="col">Batch</th>
                  <th scope="col">Status · posisi</th>
                  <th scope="col">Mulai</th>
                  <th scope="col" className={ui.num}>
                    Durasi
                  </th>
                  <th scope="col">
                    <span className="visually-hidden">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const pos =
                    p.status === "in_progress" || p.status === "timed_out"
                      ? positionLabel(p.currentPage)
                      : null;
                  const dur = formatDuration(p.durationSeconds);
                  return (
                    <tr key={p.id}>
                      <td className={`${ui.mono} ${p.status === "cancelled" ? ui.struck : ""}`}>{p.code}</td>
                      <td title={CELL_LABELS[p.cell]}>Sel {p.cell}</td>
                      <td>{p.batchLabel ?? <span className={ui.muted}>—</span>}</td>
                      <td>
                        <StatusLabel status={p.status} />
                        {pos ? <span className={ui.position}>{pos}</span> : null}
                      </td>
                      <td>
                        {p.startedAt ? (
                          dateTime.format(new Date(p.startedAt))
                        ) : (
                          <span className={ui.muted}>—</span>
                        )}
                      </td>
                      <td className={`${ui.num} ${ui.mono}`}>{dur ?? <span className={ui.muted}>—</span>}</td>
                      <td>
                        {p.status === "not_started" ? (
                          <ParticipantActions
                            id={p.id}
                            code={p.code}
                            cell={p.cell}
                            canChangeCell={canChangeCell}
                            canDeactivate={canDeactivate}
                          />
                        ) : p.status === "cancelled" ? (
                          <div className={ui.actions}>
                            <span className={ui.muted}>Dinonaktifkan</span>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className={ui.pager}>
          <span>
            Menampilkan {firstRow}–{lastRow} dari {total} ·{" "}
            {PAGE_SIZES.map((s, i) => (
              <span key={s}>
                {i > 0 ? " · " : ""}
                {s === filters.size ? (
                  <b>{s} baris</b>
                ) : (
                  <Link href={`/admin/participants${filtersToQuery({ ...filters, size: s, page: 1 })}`}>
                    {s} baris
                  </Link>
                )}
              </span>
            ))}
          </span>
          {pages > 1 ? (
            <nav aria-label="Halaman">
              {filters.page > 1 ? (
                <Link
                  className={ui.pageLink}
                  aria-label="Sebelumnya"
                  href={`/admin/participants${filtersToQuery({ ...filters, page: filters.page - 1 })}`}
                >
                  ‹
                </Link>
              ) : null}
              <span className={`${ui.pageLink} ${ui.pageLinkCurrent}`} aria-current="page">
                {filters.page} / {pages}
              </span>
              {filters.page < pages ? (
                <Link
                  className={ui.pageLink}
                  aria-label="Berikutnya"
                  href={`/admin/participants${filtersToQuery({ ...filters, page: filters.page + 1 })}`}
                >
                  ›
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>
      </section>
      <p className={ui.muted} style={{ margin: 0, fontSize: 13 }}>
        Sel hanya bisa diubah selama status <b>Belum mulai</b>. Setelah partisipan masuk, sel terkunci. Semua
        perubahan tercatat di Audit log.
      </p>
    </>
  );
}
