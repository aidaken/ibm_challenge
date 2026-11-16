// ShiftFix — written by IBM Bob
// Strict JSON schema for Granite interpreter output.

import { z } from "zod";

export const InterpreterResultSchema = z.object({
  intent: z.enum(["call_out", "accept", "decline", "question", "other", "confirm"]),
  shift_ref: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export type InterpreterResult = z.infer<typeof InterpreterResultSchema>;

export const CONFIDENCE_THRESHOLD = 0.7;
