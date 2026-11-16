// ShiftFix — written by IBM Bob
// Shared demo store: /tmp on Vercel (writable), project root locally for Playwright.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { DemoState } from "@/lib/types";
import { createSeedState } from "@/lib/db/seed";

const GLOBAL_KEY = "__shiftfix_demo_store__";

interface StoreHolder {
  state: DemoState;
}

function storePath(): string {
  // Vercel serverless filesystem is read-only except /tmp.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), "shiftfix-demo-state.json");
  }
  return path.join(process.cwd(), ".shiftfix-demo-state.json");
}

function holder(): StoreHolder {
  const g = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: StoreHolder;
  };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { state: loadInitial() };
  }
  return g[GLOBAL_KEY];
}

function readDisk(): DemoState | null {
  try {
    const file = storePath();
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(raw) as DemoState;
  } catch {
    return null;
  }
}

function writeDisk(state: DemoState): void {
  try {
    fs.writeFileSync(storePath(), JSON.stringify(state), "utf8");
  } catch (err) {
    // Memory still holds state for this instance if disk is unavailable.
    console.error("[shiftfix store] disk write failed:", err);
  }
}

function loadInitial(): DemoState {
  return readDisk() ?? createSeedState();
}

export function getState(): DemoState {
  return holder().state;
}

export function setState(next: DemoState): DemoState {
  holder().state = next;
  writeDisk(next);
  return next;
}

export function resetState(nowIso?: string): DemoState {
  return setState(createSeedState(nowIso));
}

export function updateState(mutator: (draft: DemoState) => void): DemoState {
  const current = structuredClone(getState());
  mutator(current);
  return setState(current);
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
