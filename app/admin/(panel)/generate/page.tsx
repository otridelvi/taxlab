import { ComingSoon, Forbidden } from "@/components/admin/ComingSoon";
import { requireAdmin } from "@/lib/auth/current-admin";
import { can } from "@/lib/auth/roles";

export const metadata = { title: "Generate partisipan · Taxlab Admin" };

export default async function Page() {
  const admin = await requireAdmin();
  if (!can(admin.role, "participants:generate")) return <Forbidden />;
  return <ComingSoon title="Generate partisipan" plan="PLAN-02" />;
}
