import { z } from "zod";

export const InterpretationSchema = z.object({
  intent: z.enum(["call_out", "accept", "decline", "partial_availability", "question", "other"]),
  shift_ref: z.string().optional(),
  available_from: z.string().optional(),
  available_to: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export type Interpretation = z.infer<typeof InterpretationSchema>;

// Legacy alias — keeps existing imports compiling while we migrate
export const InterpreterResultSchema = InterpretationSchema;
export type InterpreterResult = Interpretation;

export const CONFIDENCE_THRESHOLD = 0.7;
