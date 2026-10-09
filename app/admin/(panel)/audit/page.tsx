import Link from "next/link";
import { Forbidden } from "@/components/admin/ComingSoon";
import shell from "@/components/admin/admin.module.css";
import ui from "@/components/admin/ui.module.css";
import { AUDIT_ACTIONS, auditLabel, describeAudit, isSensitiveAction } from "@/lib/audit-view";
import { requireAdmin } from "@/lib/auth/current-admin";
import { can } from "@/lib/auth/roles";
import { AUDIT_PAGE_SIZE, listAdminNames, listAudit, type AuditFilter } from "@/lib/db/admin-ops";
import { dateTimeWib } from "@/lib/format";

export const metadata = { title: "Audit log · Taxlab Admin" };

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => ((Array.isArray(v) ? v[0] : v) ?? "").trim();
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseFilter(raw: Raw): AuditFilter {
  const action = one(raw.action);
  const admin = one(raw.admin);
  const code = one(raw.code).toUpperCase();
  const from = one(raw.from);
  const to = one(raw.to);
  return {
    action: (AUDIT_ACTIONS as readonly string[]).includes(action) ? action : null,
    admin: UUID.test(admin) ? admin : null,
    code: /^TX-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code) ? code : null,
    from: DATE.test(from) ? from : null,
    to: DATE.test(to) ? to : null,
    page: Math.max(1, Math.floor(Number(one(raw.page))) || 1),
  };
}

function query(f: AuditFilter, page: number): string {
  const p = new URLSearchParams();
  if (f.action) p.set("action", f.action);
  if (f.admin) p.set("admin", f.admin);
  if (f.code) p.set("code", f.code);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** A7: append-only record of admin actions (FSD-Admin §9). Read only: no edit or delete controls. */
export default async function Page({ searchParams }: PageProps<"/admin/audit">) {
  const admin = await requireAdmin();
  if (!can(admin.role, "audit:view")) return <Forbidden />;

  const filter = parseFilter(await searchParams);
  const [{ rows, total }, admins] = await Promise.all([listAudit(filter), listAdminNames()]);
  const pages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  const filtered = Boolean(filter.action || filter.admin || filter.code || filter.from || filter.to);
  const firstRow = total === 0 ? 0 : (filter.page - 1) * AUDIT_PAGE_SIZE + 1;
  const lastRow = Math.min(total, filter.page * AUDIT_PAGE_SIZE);

  return (
    <>
      <div className={shell.pageHead}>
        <div>
          <h1 className={shell.pageTitle}>Audit log</h1>
          <p className={shell.pageSubtitle}>
            Catatan tindakan admin. Tidak bisa diubah atau dihapus. Tindakan sensitif bertepi merah.
          </p>
        </div>
      </div>

      <section className={shell.card} aria-label="Tabel audit">
        <form className={ui.filters} method="get" action="/admin/audit">
          <div className={ui.field}>
            <label htmlFor="action">Tindakan</label>
            <select id="action" name="action" defaultValue={filter.action ?? ""}>
              <option value="">Semua tindakan</option>
              {AUDIT_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {auditLabel(a)}
                </option>
              ))}
            </select>
          </div>
          <div className={ui.field}>
            <label htmlFor="admin">Admin</label>
            <select id="admin" name="admin" defaultValue={filter.admin ?? ""}>
              <option value="">Semua admin</option>
              {admins.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className={ui.field}>
            <label htmlFor="code">Kode partisipan</label>
            <input id="code" name="code" defaultValue={filter.code ?? ""} placeholder="TX-…" />
          </div>
          <div className={ui.field}>
            <label htmlFor="from">Dari tanggal</label>
            <input id="from" name="from" type="date" defaultValue={filter.from ?? ""} />
          </div>
          <div className={ui.field}>
            <label htmlFor="to">Sampai tanggal</label>
            <input id="to" name="to" type="date" defaultValue={filter.to ?? ""} />
          </div>
          <button type="submit" className={ui.buttonSecondary}>
            Terapkan
          </button>
          {filtered ? (
            <Link href="/admin/audit" style={{ fontSize: 14, alignSelf: "center" }}>
              Hapus filter
            </Link>
          ) : null}
        </form>

        {rows.length === 0 ? (
          <div className={shell.emptyState}>
            <p className={shell.emptyTitle}>
              {filtered ? "Tidak ada catatan yang cocok dengan filter." : "Belum ada catatan."}
            </p>
          </div>
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th scope="col">Waktu</th>
                  <th scope="col">Admin</th>
                  <th scope="col">Tindakan</th>
                  <th scope="col">Kode</th>
                  <th scope="col">Detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={isSensitiveAction(r.action) ? ui.sensitive : undefined}>
                    <td style={{ whiteSpace: "nowrap" }}>{dateTimeWib(r.at)}</td>
                    <td>{r.adminName ?? <span className={ui.muted}>—</span>}</td>
                    <td>
                      <b>{auditLabel(r.action)}</b>
                    </td>
                    <td className={ui.mono}>
                      {r.code ? <Link href={`/admin/participants/${r.code}`}>{r.code}</Link> : <span className={ui.muted}>—</span>}
                    </td>
                    <td style={{ whiteSpace: "normal", maxWidth: 560 }}>{describeAudit(r.action, r.detail)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={ui.pager}>
          <span>
            {firstRow}–{lastRow} dari {total}
          </span>
          <nav aria-label="Halaman">
            {filter.page > 1 ? (
              <Link className={ui.pageLink} href={`/admin/audit${query(filter, filter.page - 1)}`}>
                Sebelumnya
              </Link>
            ) : null}
            <span className={`${ui.pageLink} ${ui.pageLinkCurrent}`} aria-current="page">
              {filter.page} / {pages}
            </span>
            {filter.page < pages ? (
              <Link className={ui.pageLink} href={`/admin/audit${query(filter, filter.page + 1)}`}>
                Berikutnya
              </Link>
            ) : null}
          </nav>
        </div>
      </section>
    </>
  );
}
