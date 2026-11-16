// ShiftFix — written by IBM Bob

import { NextResponse } from "next/server";
import { processTimeouts } from "@/lib/agent/handleMessage";
import { bumpNow } from "@/lib/db/queries";
import { getState } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/** Jump the demo clock ahead 11 minutes to expire pending offers. */
export async function POST() {
  bumpNow(11 * 60 * 1000);
  const result = processTimeouts();
  return NextResponse.json({ ok: true, ...result, state: getState() });
}
