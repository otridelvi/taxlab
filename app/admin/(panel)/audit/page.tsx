import { ComingSoon, Forbidden } from "@/components/admin/ComingSoon";
import { requireAdmin } from "@/lib/auth/current-admin";
import { can } from "@/lib/auth/roles";

export const metadata = { title: "Audit log · Taxlab Admin" };

export default async function Page() {
  const admin = await requireAdmin();
  if (!can(admin.role, "audit:view")) return <Forbidden />;
  return <ComingSoon title="Audit log" plan="PLAN-06" />;
}
