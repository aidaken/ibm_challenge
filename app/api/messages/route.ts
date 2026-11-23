import { NextResponse } from "next/server";
import { z } from "zod";
import { handleMessage } from "@/lib/agent/handleMessage";
import {
  ensureHydrated,
  getState,
  getStoreBackend,
  replaceState,
  setStateAsync,
} from "@/lib/db/store";
import type { DemoState } from "@/lib/types";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  senderId: z.string().min(1),
  text: z.string().min(1).max(2000),
  channel: z.enum(["group", "dm"]),
  dmPeerId: z.string().nullable().optional(),
  /** Optional client snapshot when running without Supabase. */
  clientState: z.unknown().optional(),
});

function isDemoState(value: unknown): value is DemoState {
  if (!value || typeof value !== "object") return false;
  const v = value as DemoState;
  return Array.isArray(v.employees) && Array.isArray(v.shifts);
}

export async function POST(request: Request) {
  try {
    await ensureHydrated();
    const json: unknown = await request.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid message payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Memory backend: accept client snapshot only when it is at least as fresh as
    // the server (same or more messages). Stale clientState was wiping offers /
    // announcements created by fire-and-forget bot posts on the prior request.
    if (
      getStoreBackend() === "memory" &&
      parsed.data.clientState &&
      isDemoState(parsed.data.clientState)
    ) {
      const server = getState();
      const client = parsed.data.clientState;
      if (client.messages.length >= server.messages.length) {
        replaceState(client);
      }
    }

    const result = await handleMessage({
      senderId: parsed.data.senderId,
      text: parsed.data.text,
      channel: parsed.data.channel,
      dmPeerId: parsed.data.dmPeerId,
    });

    await setStateAsync(getState());

    if (result.error) {
      return NextResponse.json(
        {
          error: result.error,
          state: getState(),
          backend: getStoreBackend(),
        },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      state: getState(),
      backend: getStoreBackend(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to post message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
