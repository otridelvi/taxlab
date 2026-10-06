import { ComingSoon, Forbidden } from "@/components/admin/ComingSoon";
import { requireAdmin } from "@/lib/auth/current-admin";
import { can } from "@/lib/auth/roles";

export const metadata = { title: "Export data · Taxlab Admin" };

export default async function Page() {
  const admin = await requireAdmin();
  if (!can(admin.role, "export:dataset")) return <Forbidden />;
  return <ComingSoon title="Export data" plan="PLAN-06" />;
}
