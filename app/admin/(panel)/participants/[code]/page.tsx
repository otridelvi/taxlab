import { notFound } from "next/navigation";
import { Forbidden } from "@/components/admin/ComingSoon";
import { requireAdmin } from "@/lib/auth/current-admin";
import { can } from "@/lib/auth/roles";
import { getParticipantByCode, loadEvents, loadResponses } from "@/lib/db/export";
import { buildTimeline, computeMetrics } from "@/lib/metrics";
import { DetailView } from "./DetailView";

export const metadata = { title: "Detail partisipan · Taxlab Admin" };

/** A5: one participant in detail (FSD-Admin §6.5). Reads responses and events; never `contacts` (DT-08). */
export default async function Page({ params }: PageProps<"/admin/participants/[code]">) {
  const admin = await requireAdmin();
  if (!can(admin.role, "participants:view")) return <Forbidden />;

  const code = decodeURIComponent((await params).code).trim().toUpperCase();
  if (!/^TX-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) notFound();
  const participant = await getParticipantByCode(code);
  if (!participant) notFound();

  const [responses, events] = await Promise.all([loadResponses([participant.id]), loadEvents([participant.id])]);
  const list = events.get(participant.id) ?? [];
  const metrics = computeMetrics({ participant, responses: responses.get(participant.id) ?? {}, events: list });

  return (
    <DetailView
      participant={{ ...participant, id: participant.id }}
      position={participant.currentPage}
      metrics={metrics}
      responses={responses.get(participant.id) ?? {}}
      timeline={buildTimeline(list)}
      eventCount={list.length}
      canExport={can(admin.role, "export:dataset")}
      canChangeCell={can(admin.role, "participants:change-cell")}
      canDeactivate={can(admin.role, "participants:deactivate")}
      canReset={can(admin.role, "participants:reset")}
    />
  );
}
