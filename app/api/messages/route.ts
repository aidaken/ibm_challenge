// ShiftFix — written by IBM Bob

import { NextResponse } from "next/server";
import { z } from "zod";
import { handleMessage } from "@/lib/agent/handleMessage";
import { getState } from "@/lib/db/store";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  senderId: z.string().min(1),
  text: z.string().min(1).max(2000),
  channel: z.enum(["group", "dm"]),
  dmPeerId: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const json: unknown = await request.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid message payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await handleMessage(parsed.data);
    if (result.error) {
      return NextResponse.json(
        { error: result.error, state: getState() },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, state: getState() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to post message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
