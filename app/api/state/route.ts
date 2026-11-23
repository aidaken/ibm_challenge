import { NextResponse } from "next/server";
import {
  ensureHydrated,
  getState,
  getStoreBackend,
  replaceState,
} from "@/lib/db/store";
import type { DemoState } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureHydrated();
  return NextResponse.json({
    state: getState(),
    backend: getStoreBackend(),
  });
}

/** Browser hydrate: restore client localStorage into the memory backend. */
export async function PUT(request: Request) {
  try {
    if (getStoreBackend() === "supabase") {
      await ensureHydrated();
      return NextResponse.json({
        ok: true,
        state: getState(),
        backend: "supabase",
        ignoredClient: true,
      });
    }
    const json = (await request.json()) as { state?: DemoState };
    if (!json.state || !Array.isArray(json.state.employees)) {
      return NextResponse.json({ error: "Invalid state" }, { status: 400 });
    }
    replaceState(json.state);
    return NextResponse.json({
      ok: true,
      state: getState(),
      backend: "memory",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "hydrate failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
