import Link from "next/link";
import { redirect } from "next/navigation";
import { SECTION_LABELS } from "@/content/flow";
import { FileMap } from "@/components/participant/FileMap";
import { FinishStep } from "@/components/participant/FinishStep";
import { FirmShell, StudyShell, type TimerInfo } from "@/components/participant/Shell";
import { StepForm } from "@/components/participant/StepForm";
import { RefBar, RefButton, RefProvider } from "@/components/participant/RefMenu";
import { caseViews, refDocs, Sheet, stepView } from "@/components/participant/steps";
import s from "@/components/participant/p.module.css";
import {
  getOpenedCases,
  getOpenedDocs,
  getParticipantSettings,
  getSavedValues,
} from "@/lib/db/participant-flow";
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
  const flowKind = participant.flowVersion === "A" ? "A" : "B";
  const docOpened = step.gate ? (await getOpenedDocs(participant.id)).includes(step.gate) : true;
  const view = stepView(step, factors, { flow: flowKind, docOpened });
  const isCases = step.kind === "cases" && step.round !== undefined;
  const opened = isCases ? await getOpenedCases(participant.id, step.round!) : [];
  const menu = step.menu ?? [];

  // Flow B: the debriefing page carries the "Survey Selesai" button itself (PLAN-05 D-12).
  if (step.ends) {
    return (
      <FirmShell section={SECTION_LABELS[step.section]} code={participant.accessCode} timer={timer}>
        {resumeNotice}
        <FinishStep page={step.id}>{view.content}</FinishStep>
      </FirmShell>
    );
  }

  const form = (
    <StepForm
      key={step.id}
      page={step.id}
      kind={step.kind}
      round={step.round}
      items={items}
      initial={initial}
      nextLabel={step.next ?? "Next"}
      footNote={view.footNote}
      fieldsTitle={view.fieldsTitle}
      fieldsIntro={view.fieldsIntro}
      parts={view.parts}
      heading={view.heading}
      cases={isCases ? caseViews() : undefined}
      opened={opened}
      locked={view.locked}
    >
      {view.content}
    </StepForm>
  );

  const body = (
    <FirmShell
      section={SECTION_LABELS[step.section]}
      code={participant.accessCode}
      timer={timer}
      wide={isCases || Boolean(step.map)}
      headerAction={menu.length > 0 ? <RefButton /> : undefined}
    >
      {resumeNotice}
      {menu.length > 0 && <RefBar />}
      {step.map ? (
        <div className={s.mapLayout}>
          <FileMap current={step.map} />
          <div className={s.mapMain}>{form}</div>
        </div>
      ) : (
        form
      )}
    </FirmShell>
  );

  // The menu Berkas (PLAN-04) is per step: opening state and the file log reset when the step changes.
  return menu.length > 0 ? (
    <RefProvider key={step.id} keys={menu} docs={refDocs(factors, menu, flowKind)}>
      {body}
    </RefProvider>
  ) : (
    body
  );
}
