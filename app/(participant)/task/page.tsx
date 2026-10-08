import Link from "next/link";
import { redirect } from "next/navigation";
import { SECTION_LABELS } from "@/content/flow";
import { FinishStep } from "@/components/participant/FinishStep";
import { FirmShell, StudyShell, type TimerInfo } from "@/components/participant/Shell";
import { StepForm } from "@/components/participant/StepForm";
import { Sheet, stepView } from "@/components/participant/steps";
import s from "@/components/participant/p.module.css";
import { getParticipantSettings, getSavedValues } from "@/lib/db/participant-flow";
import { itemsForStep, isTaskStep, TIME_UP_STEP_ID } from "@/lib/flow";
import { applyTimeout, readParticipantSession, remainingMs } from "@/lib/participant-api";
import { P_MESSAGES } from "@/lib/participant-messages";

export const metadata = { title: "Penugasan · Wiradana & Rekan" };

function formatLeft(ms: number) {
  const total = Math.ceil(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** "/task" · the one URL for every step; the server decides which step to show (FSD §3). */
export default async function TaskPage({ searchParams }: PageProps<"/task">) {
  let session = await readParticipantSession();
  if (session.kind === "active") session = await applyTimeout(session);

  if (session.kind === "none") redirect("/login");

  if (session.kind === "replaced") {
    return (
      <StudyShell slim>
        <Sheet doc={false}>
          <div className={s.kick}>Sesi berpindah</div>
          <h1 className={s.title} style={{ fontSize: 28 }}>
            {P_MESSAGES.sessionReplaced}
          </h1>
          <p>
            Jawaban anda tetap tersimpan. Untuk melanjutkan di perangkat ini, masuk kembali dengan kode yang
            sama.
          </p>
          <Link className={s.btn} href={`/login?code=${encodeURIComponent(session.participant.accessCode)}`}>
            Lanjutkan di sini
          </Link>
        </Sheet>
      </StudyShell>
    );
  }

  if (session.kind === "inactive") {
    const status = session.participant.status;
    const text =
      status === "completed"
        ? P_MESSAGES.codeCompleted
        : status === "cancelled"
          ? P_MESSAGES.codeCancelled
          : P_MESSAGES.codeClosed;
    return (
      <StudyShell slim>
        <Sheet doc={false}>
          <h1 className={s.title} style={{ fontSize: 28 }}>
            {text}
          </h1>
        </Sheet>
      </StudyShell>
    );
  }

  const { participant, step, flow, factors } = session;
  const settings = await getParticipantSettings();
  const left = remainingMs(participant);
  const timer: TimerInfo =
    left !== null
      ? { state: "running", leftMs: left, warningMs: settings.timerWarningMinutes * 60_000, page: step.id }
      : participant.taskEndAt && (step.id === TIME_UP_STEP_ID || !isTaskStep(flow, step.id))
        ? { state: "done" }
        : { state: "none" };
  const { resumed } = await searchParams;

  const resumeNotice =
    resumed === "1" ? (
      <div className={s.banner} role="status">
        Melanjutkan dari halaman terakhir.{left !== null ? ` Sisa waktu anda: ${formatLeft(left)}.` : ""}
      </div>
    ) : null;

  if (step.kind === "finish") {
    return (
      <FirmShell section={SECTION_LABELS[step.section]} code={participant.accessCode} timer={timer}>
        {resumeNotice}
        <FinishStep />
      </FirmShell>
    );
  }

  const items = itemsForStep(step, factors);
  const initial = await getSavedValues(
    participant.id,
    items.map((i) => i.key),
  );
  const view = stepView(step, factors);

  return (
    <FirmShell section={SECTION_LABELS[step.section]} code={participant.accessCode} timer={timer}>
      {resumeNotice}
      <StepForm
        key={step.id}
        page={step.id}
        items={items}
        initial={initial}
        nextLabel={step.next ?? "Next"}
        footNote={view.footNote}
        fieldsTitle={view.fieldsTitle}
        fieldsIntro={view.fieldsIntro}
      >
        {view.content}
      </StepForm>
    </FirmShell>
  );
}
