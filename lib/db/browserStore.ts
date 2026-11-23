/**
 * Browser-only localStorage helpers for when Supabase is not configured.
 */

import type { DemoState } from "@/lib/types";

const KEY = "shiftfix.demoState.v1";

export function loadBrowserState(): DemoState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoState;
    if (!Array.isArray(parsed.employees)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveBrowserState(state: DemoState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.error("[browserStore] save failed:", err);
  }
}

export function clearBrowserState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
