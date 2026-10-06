import { ACCOUNTS, E2E_PASSWORD, clearLoginAttempts, requireSitEnv, serviceClient } from "./fixtures";

async function findUserId(email: string): Promise<string | undefined> {
  const supabase = serviceClient();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < 100) return undefined;
  }
  return undefined;
}

/** Create the auth user if missing, otherwise reset its password. */
async function ensureAuthUser(email: string): Promise<string> {
  const supabase = serviceClient();
  const existing = await findUserId(email);
  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing, { password: E2E_PASSWORD });
    if (error) throw new Error(`updateUser ${email}: ${error.message}`);
    return existing;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: E2E_PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`);
  return data.user.id;
}

export default async function globalSetup() {
  requireSitEnv();
  const supabase = serviceClient();

  for (const account of [ACCOUNTS.admin, ACCOUNTS.viewer, ACCOUNTS.inactive]) {
    const id = await ensureAuthUser(account.email);
    const { error } = await supabase
      .from("admins")
      .upsert({ id, name: account.name, role: account.role, active: account.active }, { onConflict: "id" });
    if (error) throw new Error(`upsert admin ${account.email}: ${error.message}`);
  }

  const nonAdminId = await ensureAuthUser(ACCOUNTS.nonAdmin.email);
  const { error } = await supabase.from("admins").delete().eq("id", nonAdminId);
  if (error) throw new Error(`remove non-admin row: ${error.message}`);

  await clearLoginAttempts(...Object.values(ACCOUNTS).map((a) => a.email));
}
