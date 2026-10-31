import Link from "next/link";
import { Forbidden } from "@/components/admin/ComingSoon";
import shell from "@/components/admin/admin.module.css";
import ui from "@/components/admin/ui.module.css";
import type { Cell } from "@/lib/allocate";
import { requireAdmin } from "@/lib/auth/current-admin";
import { can } from "@/lib/auth/roles";
import { getCompletedPerCell, listBatches } from "@/lib/db/participants";
import { serverEnv } from "@/lib/env";
import { GenerateForm } from "./GenerateForm";

export const metadata = { title: "Generate partisipan · Taxlab Admin" };

const dateTime = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

export default async function GeneratePage({ searchParams }: PageProps<"/admin/generate">) {
  const admin = await requireAdmin();
  if (!can(admin.role, "participants:generate")) return <Forbidden />;

  const params = await searchParams;
  const initialMode = params.mode === "manual" ? "manual" : "random";
  const cellParam = Number(params.cell);
  const initialCell = ([1, 2, 3, 4].includes(cellParam) ? cellParam : 1) as Cell;

  const [{ completed, total }, batches] = await Promise.all([getCompletedPerCell(), listBatches(10)]);

  return (
    <>
      <div className={shell.pageHead}>
        <div>
          <h1 className={shell.pageTitle}>Generate partisipan</h1>
          <p className={shell.pageSubtitle}>Buat kode akses baru. Sel ditetapkan saat kode dibuat.</p>
        </div>
      </div>

      <GenerateForm
        completed={completed}
        total={total}
        initialMode={initialMode}
        initialCell={initialCell}
        baseUrl={serverEnv().APP_BASE_URL}
      />

      <section className={shell.card} aria-labelledby="recent">
        <div className={ui.cardHead}>
          <h2 id="recent">Batch terakhir</h2>
          <span>Daftar kode bisa diunduh atau dicetak ulang kapan saja</span>
        </div>
        {batches.length === 0 ? (
          <div className={shell.emptyState}>
            <p className={shell.emptyText}>Belum ada batch.</p>
          </div>
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th scope="col">Batch</th>
                  <th scope="col">Dibuat</th>
                  <th scope="col">Mode</th>
                  <th scope="col" className={ui.num}>
                    Kode
                  </th>
                  <th scope="col">
                    <span className="visually-hidden">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link href={`/admin/participants?batch=${b.id}`}>{b.label ?? "Tanpa label"}</Link>
                    </td>
                    <td>{dateTime.format(new Date(b.createdAt))}</td>
                    <td>{b.mode === "random" ? "Acak berimbang" : "Manual"}</td>
                    <td className={ui.num}>{b.quantity}</td>
                    <td>
                      <div className={ui.actions}>
                        <a href={`/admin/print/batches/${b.id}`} target="_blank" rel="noopener">
                          Cetak kartu
                        </a>
                        <a href={`/api/admin/batches/${b.id}/codes?format=csv`}>CSV</a>
                        <a href={`/api/admin/batches/${b.id}/codes?format=xlsx`}>XLSX</a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
