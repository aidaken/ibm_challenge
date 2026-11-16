// ShiftFix — written by IBM Bob
// File-backed demo store so API routes share one state in Next.js/Playwright.

import fs from "node:fs";
import path from "node:path";
import type { DemoState } from "@/lib/types";
import { createSeedState } from "@/lib/db/seed";

const STORE_PATH = path.join(process.cwd(), ".shiftfix-demo-state.json");

function readDisk(): DemoState | null {
  try {
    if (!fs.existsSync(STORE_PATH)) return null;
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    return JSON.parse(raw) as DemoState;
  } catch {
    return null;
  }
}

function writeDisk(state: DemoState): void {
  fs.writeFileSync(STORE_PATH, JSON.stringify(state), "utf8");
}

export function getState(): DemoState {
  const existing = readDisk();
  if (existing) return existing;
  const seeded = createSeedState();
  writeDisk(seeded);
  return seeded;
}

export function setState(next: DemoState): DemoState {
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
