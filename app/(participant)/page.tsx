import { redirect } from "next/navigation";
import { CONSENT } from "@/content/text";
import { ConsentForm } from "./ConsentForm";
import { StudyShell } from "@/components/participant/Shell";
import { Html, Sheet } from "@/components/participant/steps";
import s from "@/components/participant/p.module.css";
import { readParticipantSession } from "@/lib/participant-api";

export const metadata = { title: "Kesediaan berpartisipasi · Studi SPT Tahunan" };

/** "/" · informed consent (FSD §5.1). */
export default async function ConsentPage({ searchParams }: PageProps<"/">) {
  const session = await readParticipantSession();
  if (session.kind === "active") redirect("/task");
  const { code } = await searchParams;

  return (
    <StudyShell>
      <Sheet>
        <div className={s.kick}>Informed consent</div>
        <h1 className={s.title}>Kesediaan Berpartisipasi</h1>
        {CONSENT.map((p, i) => (
          <Html key={i} html={p} />
        ))}
      </Sheet>
      <ConsentForm code={typeof code === "string" ? code.slice(0, 20) : ""} />
    </StudyShell>
  );
}
