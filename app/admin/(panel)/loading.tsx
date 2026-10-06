import styles from "@/components/admin/admin.module.css";

/** Shown instantly while an admin page loads on the server. */
export default function Loading() {
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      Memuat…
    </div>
  );
}
