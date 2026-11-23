import { NextResponse } from "next/server";
import { getStoreBackend, resetStateAsync } from "@/lib/db/store";
import { resetAiCallCount } from "@/lib/ai/sessionCap";

export const dynamic = "force-dynamic";

export async function POST() {
  const state = await resetStateAsync();
  resetAiCallCount();
  return NextResponse.json({
    ok: true,
    state,
    backend: getStoreBackend(),
  });
}
