/**
 * Create (or update) an admin account.
 *
 *   npm run admin:create -- <email> "<name>" <role>
 *
 * role: admin | assistant | viewer
 *
 * Creates the Supabase Auth user with a temporary password (shown once),
 * then inserts/updates the matching row in `admins`. If the auth user
 * already exists, only the `admins` row is updated and the password is kept.
 */
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { isAdminRole } from "../lib/auth/roles";
import type { Database } from "../lib/db/types";

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function temporaryPassword(): string {
  // 18 URL-safe characters
  return randomBytes(14).toString("base64url").slice(0, 18);
}

async function main() {
  const [emailArg, nameArg, roleArg = "admin"] = process.argv.slice(2);
  if (!emailArg || !nameArg) {
    fail('Usage: npm run admin:create -- <email> "<name>" <admin|assistant|viewer>');
  }
  const email = emailArg.trim().toLowerCase();
  const name = nameArg.trim();
  if (!isAdminRole(roleArg)) fail(`Unknown role "${roleArg}". Use admin, assistant or viewer.`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");

  const supabase = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId: string | undefined;
  let password: string | undefined = temporaryPassword();

  const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.data.user) {
    userId = created.data.user.id;
  } else if (created.error?.code === "email_exists" || created.error?.status === 422) {
    password = undefined;
    for (let page = 1; !userId && page <= 20; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
      if (error) fail(`Could not look up existing user: ${error.message}`);
      userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id;
      if (data.users.length < 100) break;
    }
    if (!userId) fail(`User ${email} exists but could not be found.`);
  } else {
    fail(`Could not create auth user: ${created.error?.message ?? "unknown error"}`);
  }

  const { error: upsertError } = await supabase
    .from("admins")
    .upsert({ id: userId, name, role: roleArg, active: true }, { onConflict: "id" });
  if (upsertError) fail(`Could not save admin row: ${upsertError.message}`);

  console.log("\n✓ Admin ready");
  console.log(`  Email : ${email}`);
  console.log(`  Name  : ${name}`);
  console.log(`  Role  : ${roleArg}`);
  if (password) {
    console.log(`  Temporary password: ${password}`);
    console.log("  Share it securely and ask the admin to change it after first login.");
  } else {
    console.log("  Existing account: password unchanged.");
  }
  console.log("");
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
