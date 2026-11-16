// ShiftFix — written by IBM Bob

import { NextResponse } from "next/server";
import { resetState } from "@/lib/db/store";

export const dynamic = "force-dynamic";

export async function POST() {
  const state = resetState();
  return NextResponse.json({ ok: true, state });
}
