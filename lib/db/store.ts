/**
 * Demo state facade.
 * - Supabase snapshot when SUPABASE_URL + key are set (Vercel-safe).
 * - Otherwise in-process memory (+ local file for Playwright/dev).
 * Browser localStorage is handled by the client (see DemoApp) when backend is memory.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { DemoState } from "@/lib/types";
import { createSeedState } from "@/lib/db/seed";
import { isSupabaseConfigured } from "@/lib/db/supabaseClient";
import {
  clearSnapshot,
  loadSnapshot,
  saveSnapshot,
} from "@/lib/db/supabaseStore";

const GLOBAL_KEY = "__shiftfix_demo_store__";

interface StoreHolder {
  state: DemoState;
  hydratedFromSupabase: boolean;
}

function holder(): StoreHolder {
  const g = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: StoreHolder;
  };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = {
      state: loadInitialMemory(),
      hydratedFromSupabase: false,
    };
  }
  return g[GLOBAL_KEY];
}

function storePath(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), "shiftfix-demo-state.json");
  }
  return path.join(process.cwd(), ".shiftfix-demo-state.json");
}

function readDisk(): DemoState | null {
  try {
    const file = storePath();
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8")) as DemoState;
  } catch {
    return null;
  }
}

function writeDisk(state: DemoState): void {
  try {
    fs.writeFileSync(storePath(), JSON.stringify(state), "utf8");
  } catch (err) {
    console.error("[store] disk write failed:", err);
  }
}

function loadInitialMemory(): DemoState {
  return readDisk() ?? createSeedState();
}

export type StoreBackend = "supabase" | "memory";

export function getStoreBackend(): StoreBackend {
  return isSupabaseConfigured() ? "supabase" : "memory";
}

/** Ensure Supabase snapshot is loaded into memory once per isolate. */
export async function ensureHydrated(): Promise<DemoState> {
  const h = holder();
  if (getStoreBackend() !== "supabase") return h.state;
  if (h.hydratedFromSupabase) return h.state;

  const snap = await loadSnapshot();
  if (snap) {
    h.state = snap;
  } else {
    h.state = createSeedState();
    await saveSnapshot(h.state);
  }
  h.hydratedFromSupabase = true;
  return h.state;
}

export function getState(): DemoState {
  return holder().state;
}

export function setState(next: DemoState): DemoState {
  const h = holder();
  h.state = next;
  if (getStoreBackend() === "memory") {
    writeDisk(next);
  } else {
    // Fire-and-forget persist; callers that need await use setStateAsync
    void saveSnapshot(next);
  }
  return next;
}

export async function setStateAsync(next: DemoState): Promise<DemoState> {
  const h = holder();
  h.state = next;
  h.hydratedFromSupabase = true;
  if (getStoreBackend() === "supabase") {
    await saveSnapshot(next);
  } else {
    writeDisk(next);
  }
  return next;
}

export function resetState(nowIso?: string): DemoState {
  const next = createSeedState(nowIso);
  const h = holder();
  h.state = next;
  h.hydratedFromSupabase = true;
  if (getStoreBackend() === "memory") {
    writeDisk(next);
  } else {
    void saveSnapshot(next);
  }
  return next;
}

export async function resetStateAsync(nowIso?: string): Promise<DemoState> {
  const next = createSeedState(nowIso);
  const h = holder();
  h.state = next;
  h.hydratedFromSupabase = true;
  if (getStoreBackend() === "supabase") {
    await clearSnapshot();
    await saveSnapshot(next);
  } else {
    writeDisk(next);
  }
  return next;
}

/** Replace in-memory state (browser hydrate / client round-trip). */
export function replaceState(next: DemoState): DemoState {
  return setState(next);
}

export function updateState(mutator: (draft: DemoState) => void): DemoState {
  const current = structuredClone(getState());
  mutator(current);
  return setState(current);
}

export async function updateStateAsync(
  mutator: (draft: DemoState) => void,
): Promise<DemoState> {
  await ensureHydrated();
  const current = structuredClone(getState());
  mutator(current);
  return setStateAsync(current);
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
