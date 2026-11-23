/**
 * Persists the full DemoState as one JSON snapshot so assign/reset stay atomic.
 */

import type { DemoState } from "@/lib/types";
import { getSupabaseAdmin } from "@/lib/db/supabaseClient";

const SNAPSHOT_ID = "default";

export async function loadSnapshot(): Promise<DemoState | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data, error } = await sb
    .from("demo_snapshots")
    .select("state")
    .eq("id", SNAPSHOT_ID)
    .maybeSingle();
  if (error) {
    console.error("[supabase] loadSnapshot:", error.message);
    return null;
  }
  if (!data?.state) return null;
  return data.state as DemoState;
}

export async function saveSnapshot(state: DemoState): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) return false;
  const { error } = await sb.from("demo_snapshots").upsert({
    id: SNAPSHOT_ID,
    state,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("[supabase] saveSnapshot:", error.message);
    return false;
  }
  return true;
}

export async function clearSnapshot(): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) return false;
  const { error } = await sb.from("demo_snapshots").delete().eq("id", SNAPSHOT_ID);
  if (error) {
    console.error("[supabase] clearSnapshot:", error.message);
    return false;
  }
  return true;
}
