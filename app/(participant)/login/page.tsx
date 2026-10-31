import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";
import { StudyShell } from "@/components/participant/Shell";
import { serverEnv } from "@/lib/env";
import { readParticipantSession } from "@/lib/participant-api";
import { CONSENT_COOKIE, verifyConsent } from "@/lib/participant-session";

export const metadata = { title: "Masuk · Studi SPT Tahunan" };

/** "/login" · enter with an access code (FSD §5.2). */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { code: rawCode } = await searchParams;
  const code = typeof rawCode === "string" ? rawCode.slice(0, 20) : "";
  const session = await readParticipantSession();
  if (session.kind === "active") redirect("/task");

  // New participants agree first. Someone whose session moved to another tab
  // (cookie present) can log in again directly.
  if (session.kind === "none") {
    const consent = await verifyConsent(
      (await cookies()).get(CONSENT_COOKIE)?.value,
      serverEnv().SESSION_SECRET,
    );
    if (!consent) redirect(code ? `/?code=${encodeURIComponent(code)}` : "/");
  }

  return (
    <StudyShell slim>
      <LoginForm defaultCode={code} />
    </StudyShell>
  );
}
