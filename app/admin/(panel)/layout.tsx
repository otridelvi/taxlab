import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminNav } from "@/components/admin/AdminNav";
import styles from "@/components/admin/admin.module.css";
import { requireAdmin } from "@/lib/auth/current-admin";
import { navItemsFor } from "@/lib/auth/roles";
import { serverEnv } from "@/lib/env";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const env = serverEnv().APP_ENV;

  return (
    <>
      <AdminHeader env={env} adminName={admin.name} />
      <div className={styles.shell}>
        <aside className={styles.side}>
          <AdminNav items={navItemsFor(admin.role)} />
        </aside>
        <main className={styles.content}>{children}</main>
      </div>
    </>
  );
}
