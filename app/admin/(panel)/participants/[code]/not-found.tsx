import Link from "next/link";
import shell from "@/components/admin/admin.module.css";

export default function NotFound() {
  return (
    <section className={shell.card}>
      <div className={shell.emptyState}>
        <p className={shell.emptyTitle}>Kode tidak ditemukan.</p>
        <p className={shell.emptyText}>
          Periksa penulisan kode, atau <Link href="/admin/participants">kembali ke daftar partisipan</Link>.
        </p>
      </div>
    </section>
  );
}
