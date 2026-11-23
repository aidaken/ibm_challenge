/**
 * Supabase clients. Server uses service role when available (never expose to browser).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serviceClient: SupabaseClient | null = null;
let anonClient: SupabaseClient | null = null;

export function supabaseUrl(): string | undefined {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    undefined
  );
}

export function supabaseAnonKey(): string | undefined {
  return (
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    undefined
  );
}

export function isSupabaseConfigured(): boolean {
  const url = supabaseUrl();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || supabaseAnonKey();
  return Boolean(url && key);
}

/** Prefer service role on the server for writes. */
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = supabaseUrl();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anon = supabaseAnonKey();
  if (!url || (!service && !anon)) return null;

  if (service) {
    if (!serviceClient) {
      serviceClient = createClient(url, service, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    return serviceClient;
  }

  if (!anonClient) {
    anonClient = createClient(url, anon!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return anonClient;
}

/** @deprecated use getSupabaseAdmin */
export function getSupabase(): SupabaseClient | null {
  return getSupabaseAdmin();
}
