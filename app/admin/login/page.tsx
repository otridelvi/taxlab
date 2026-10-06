import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { AUTH_MESSAGES } from "@/lib/auth/messages";
import { safeNextPath } from "@/lib/auth/redirect";
import { serverEnv } from "@/lib/env";
import { LoginForm } from "./LoginForm";
import styles from "./login.module.css";

export const metadata = { title: "Masuk · Taxlab Admin" };

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const reason = typeof params.reason === "string" ? params.reason : undefined;

  if (await getCurrentAdmin()) redirect(safeNextPath(next));

  return (
    <>
      <AdminHeader env={serverEnv().APP_ENV} />
      <main className={styles.wrap}>
        <div className={styles.card}>
          <div className={styles.kicker}>Khusus peneliti</div>
          <h1 className={styles.title}>Masuk ke panel admin</h1>
          {reason === "expired" ? (
            <p className={styles.notice} role="status">
              {AUTH_MESSAGES.sessionExpired}
            </p>
          ) : null}
          <LoginForm next={next} />
        </div>
        <p className={styles.note}>
          Akun admin dibuat oleh pengelola sistem. Sesi berakhir otomatis setelah 12 jam.
        </p>
      </main>
    </>
  );
}
