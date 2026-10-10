import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  APP_ENV: z.enum(["sit", "production"]),
  APP_BASE_URL: z.url(),
  SESSION_SECRET: z.string().min(32, "must be at least 32 characters"),
  /** Bearer token for GET /api/health (keep-alive). Without it the endpoint always answers 401. */
  HEALTHCHECK_TOKEN: z.string().min(16, "must be at least 16 characters").optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type AppEnv = ServerEnv["APP_ENV"];

/**
 * Validates environment variables. Throws one readable error listing every
 * missing or invalid variable, so a misconfigured deploy fails loudly.
 */
export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join(".")} (${issue.message})`)
      .join(", ");
    throw new Error(`Invalid environment variables: ${problems}. Check .env.local (see .env.example).`);
  }
  return result.data;
}

let cached: ServerEnv | undefined;

/** Server-side environment, validated once per process. */
export function serverEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}
