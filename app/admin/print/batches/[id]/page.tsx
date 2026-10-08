import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/current-admin";
import { can } from "@/lib/auth/roles";
import { getBatchCodes } from "@/lib/db/participants";
import { serverEnv } from "@/lib/env";
import { loginLink } from "@/lib/participants";
import { PrintButton } from "./PrintButton";
import styles from "./print.module.css";

export const metadata = { title: "Kartu kode akses · Taxlab Admin" };

/** Printable access-code cards, 21 per A4 page (G-11). Never shows the cell. */
export default async function PrintCardsPage({ params }: PageProps<"/admin/print/batches/[id]">) {
  const admin = await requireAdmin();
  if (!can(admin.role, "participants:generate")) notFound();

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const found = await getBatchCodes(id);
  if (!found) notFound();

  const base = serverEnv().APP_BASE_URL;
  const host = base.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const cards = await Promise.all(
    found.codes.map(async (code) => ({
      code,
      qr: await QRCode.toString(loginLink(base, code), { type: "svg", margin: 0, errorCorrectionLevel: "M" }),
    })),
  );
  const label = found.batch.label ?? "Tanpa label";

  return (
    <main className={styles.page}>
      <div className={styles.toolbar}>
        <div>
          <b>
            {label} · {cards.length} kartu
          </b>
          <span>Cetak di kertas A4 (21 kartu per halaman), lalu gunting di garis putus-putus.</span>
        </div>
        <PrintButton />
      </div>
      <div className={styles.sheet}>
        {cards.map((c) => (
          <div key={c.code} className={styles.card}>
            <div className={styles.qr} aria-hidden="true" dangerouslySetInnerHTML={{ __html: c.qr }} />
            <div className={styles.text}>
              <div className={styles.kicker}>Studi Penyelesaian SPT Tahunan</div>
              <div className={styles.code}>{c.code}</div>
              <div className={styles.small}>Pindai QR atau buka {host}/login</div>
              <div className={styles.small}>{label}</div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
