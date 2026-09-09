import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL_VAR = "NEXT_PUBLIC_SUPABASE_URL";
const ANON_VAR = "NEXT_PUBLIC_SUPABASE_ANON_KEY";
const SERVICE_VAR = "SUPABASE_SERVICE_ROLE_KEY";

/**
 * Server-side client. Uses the service role key, so it bypasses RLS and can
 * read/write orders. This module must never be imported from a "use client"
 * file — the key would then be inlined into the browser bundle.
 */
export function supabaseAdmin(): SupabaseClient {
  const url = process.env[URL_VAR];
  const key = process.env[SERVICE_VAR];
  if (!url || !key) {
    throw new Error(
      `Supabase is not configured. Set ${URL_VAR} and ${SERVICE_VAR}.`,
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Public/anon client. Read-only against the menu, per the RLS policies. */
export function supabaseAnon(): SupabaseClient {
  const url = process.env[URL_VAR];
  const key = process.env[ANON_VAR];
  if (!url || !key) {
    throw new Error(
      `Supabase is not configured. Set ${URL_VAR} and ${ANON_VAR}.`,
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
