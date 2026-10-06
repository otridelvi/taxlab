import type { AppEnv } from "@/lib/env";
import styles from "./admin.module.css";

export function EnvBadge({ env }: { env: AppEnv }) {
  return (
    <span className={env === "sit" ? `${styles.env} ${styles.envSit}` : styles.env}>
      {env === "sit" ? "SIT" : "PRODUCTION"}
    </span>
  );
}

export function AdminHeader({ env, adminName }: { env: AppEnv; adminName?: string }) {
  return (
    <header className={env === "sit" ? `${styles.bar} ${styles.barSit}` : styles.bar}>
      <div className={styles.barInner}>
        <div className={styles.logo}>
          <span className={styles.logoMark} aria-hidden="true">
            TX
          </span>
          Taxlab Admin
          <EnvBadge env={env} />
        </div>
        {adminName ? (
          <div className={styles.who}>
            <span>{adminName}</span>
            <form action="/admin/logout" method="post">
              <button type="submit" className={styles.logout}>
                Keluar
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </header>
  );
}
