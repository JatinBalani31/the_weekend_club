import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Checks once (per process) whether a column exists, so the app keeps working
 * when it is deployed before its migration has been applied.
 *
 * Without this, code that selects a not-yet-created column gets a 400 from
 * PostgREST rather than a null, which turns a pending migration into an outage:
 * `sessions_valid_from` in particular would fail every session lookup and log
 * everyone out with no way back in.
 *
 * Once a migration is applied everywhere, its probe can be dropped and the
 * column named unconditionally.
 */
const cache = new Map<string, boolean>();

export async function hasColumn(supabase: SupabaseClient, table: string, column: string): Promise<boolean> {
  const key = `${table}.${column}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const { error } = await supabase.from(table).select(column).limit(1);
  const exists = error?.code !== "42703"; // 42703 is undefined_column
  cache.set(key, exists);

  if (!exists) {
    console.warn(`${key} is missing - apply the pending migration. Running without it for now.`);
  }
  return exists;
}
