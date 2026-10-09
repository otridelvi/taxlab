import { Forbidden } from "@/components/admin/ComingSoon";
import shell from "@/components/admin/admin.module.css";
import { requireAdmin } from "@/lib/auth/current-admin";
import { can } from "@/lib/auth/roles";
import { listBatches } from "@/lib/db/participants";
import { ExportPanel } from "./ExportPanel";

export const metadata = { title: "Export data · Taxlab Admin" };

export default async function Page() {
  const admin = await requireAdmin();
  if (!can(admin.role, "export:dataset")) return <Forbidden />;
  const batches = await listBatches();
  return (
    <>
      <div className={shell.pageHead}>
        <div>
          <h1 className={shell.pageTitle}>Export data</h1>
          <p className={shell.pageSubtitle}>Dataset, event log, dan codebook siap analisis (XLSX atau CSV).</p>
        </div>
      </div>
      <ExportPanel batches={batches.map((b) => ({ id: b.id, label: b.label }))} canContacts={can(admin.role, "export:contacts")} />
    </>
  );
}
