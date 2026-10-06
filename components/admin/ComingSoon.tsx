import styles from "./admin.module.css";

export function ComingSoon({ title, plan }: { title: string; plan: string }) {
  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>{title}</h1>
      </div>
      <section className={styles.card}>
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Segera hadir</p>
          <p className={styles.emptyText}>Halaman ini dikerjakan di {plan}.</p>
        </div>
      </section>
    </>
  );
}

export function Forbidden() {
  return (
    <section className={styles.card}>
      <div className={styles.emptyState}>
        <p className={styles.emptyTitle}>Akses ditolak</p>
        <p className={styles.emptyText}>Anda tidak memiliki izin untuk membuka halaman ini.</p>
      </div>
    </section>
  );
}
