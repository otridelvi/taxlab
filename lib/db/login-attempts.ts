import "server-only";
import { attemptWindowStart } from "@/lib/auth/rate-limit";
import { serviceClient } from "./service";

export async function countRecentFailedLogins(email: string, now: Date = new Date()): Promise<number> {
  const { count, error } = await serviceClient()
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .eq("success", false)
    .gte("created_at", attemptWindowStart(now).toISOString());
  if (error) throw new Error(`Failed to count login attempts: ${error.message}`);
  return count ?? 0;
}

export async function recordLoginAttempt(email: string, success: boolean, ip: string | null): Promise<void> {
  const { error } = await serviceClient().from("login_attempts").insert({ email, success, ip });
  if (error) throw new Error(`Failed to record login attempt: ${error.message}`);
}
