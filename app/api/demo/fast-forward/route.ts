import { NextResponse } from "next/server";
import { processTimeouts } from "@/lib/agent/handleMessage";
import { bumpNow } from "@/lib/db/queries";
import {
  ensureHydrated,
  getState,
  getStoreBackend,
  setStateAsync,
} from "@/lib/db/store";
import type { DemoState } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await ensureHydrated();

  try {
    const body = (await request.json().catch(() => ({}))) as {
      clientState?: DemoState;
    };
    if (
      getStoreBackend() === "memory" &&
      body.clientState &&
      Array.isArray(body.clientState.employees)
    ) {
      const { replaceState } = await import("@/lib/db/store");
      replaceState(body.clientState);
    }
  } catch {
    // no body is fine
  }

  bumpNow(11 * 60 * 1000);
  const result = await processTimeouts();
  await setStateAsync(getState());
  return NextResponse.json({
    ok: true,
    ...result,
    state: getState(),
    backend: getStoreBackend(),
  });
}
