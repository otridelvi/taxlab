/**
 * Quick connection check against the Supabase project in .env.local.
 *
 *   npm run db:check
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/db/types";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Supabase env vars are missing in .env.local");

  const supabase = createClient<Database>(url, serviceKey, { auth: { persistSession: false } });

  const admins = await supabase.from("admins").select("id", { count: "exact", head: true });
  if (admins.error) throw new Error(`admins: ${admins.error.message}`);

  const summary = await supabase.from("v_cell_summary").select("cell");
  if (summary.error) throw new Error(`v_cell_summary: ${summary.error.message}`);

  console.log(`ok · ${url} · admins=${admins.count ?? 0} · cells=${summary.data?.length ?? 0}`);
}

main().catch((err) => {
  console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
