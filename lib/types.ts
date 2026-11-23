export type EmployeeRole = "barista" | "cashier" | "manager";

export type CoverageStatus =
  | "open"
  | "planning"
  | "offering"
  | "covered"
  | "filled"      // alias for covered (kept for backward compat)
  | "escalated";

export type CoveragePartStatus = "open" | "offering" | "accepted" | "covered";

export type OfferStatus = "pending" | "accepted" | "declined" | "timed_out" | "skipped";

export type MessageChannel = "group" | "dm";

export type Actor = "agent" | "worker" | "manager";

export type Intent =
  | "call_out"
  | "accept"
  | "decline"
  | "partial_availability"
  | "question"
  | "other";

export interface Employee {
  id: string;
  name: string;
  roles: EmployeeRole[];
  maxWeeklyHours: number;
  isManager: boolean;
  isBot?: boolean;
  lastPickupAt: string | null;
}

export interface AvailabilityWindow {
  id: string;
  employeeId: string;
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
}

export interface Shift {
  id: string;
  employeeId: string;
  role: EmployeeRole;
  start: string;
  end: string;
  status: "scheduled" | "needs_cover" | "covered" | "cancelled";
}

export interface CoverageRequest {
  id: string;
  shiftId: string;
  calledOutBy?: string;
  reason: string;
  status: CoverageStatus;
  currentOfferId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One piece of a potentially split shift. */
export interface CoveragePart {
  id: string;
  requestId: string;
  startsAt: string;
  endsAt: string;
  status: CoveragePartStatus;
  assignedEmployeeId: string | null;
}

export interface Offer {
  id: string;
  requestId: string;
  partId?: string;      // set when covering a split part
  employeeId: string;
  rank: number;
  status: OfferStatus;
  sentAt: string;
  answeredAt: string | null;
  expiresAt: string;
  skipReason: string | null;
}

export interface Message {
  id: string;
  channel: MessageChannel;
  /** For DMs: the human peer employee id. Null for group chat. */
  dmPeerId: string | null;
  senderId: string;
  text: string;
  graniteIntent: Intent | null;
  confidence: number | null;
  /** Which AI provider interpreted this message (undefined for bot messages). */
  aiProvider?: string;
  /** Model id when a remote provider was used. */
  aiModelId?: string;
  /** Latency of the AI call that produced the interpretation, in ms. */
  aiLatencyMs?: number;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  requestId: string | null;
  actor: Actor;
  action: string;
  reason: string;
  /** Which AI provider generated this reason string, if any. */
  aiProvider?: string;
  /** Model id when a remote provider was used. */
  aiModelId?: string;
  /** Latency of the AI call that produced the reason, in ms. */
  aiLatencyMs?: number;
  timestamp: string;
}

export interface RankingCandidate {
  employee: Employee;
  hoursThisWeek: number;
  lastPickupAt: string | null;
}

export interface SkipRecord {
  employeeId: string;
  employeeName: string;
  reason: string;
}

export interface RankingResult {
  eligible: RankingCandidate[];
  skipped: SkipRecord[];
}

export interface DemoState {
  employees: Employee[];
  availability: AvailabilityWindow[];
  shifts: Shift[];
  coverageRequests: CoverageRequest[];
  coverageParts: CoveragePart[];
  offers: Offer[];
  messages: Message[];
  auditEvents: AuditEvent[];
  /** Simulated clock used by offer timeouts / fast-forward. */
  nowIso: string;
  /** Demo week Monday used for the cafe seed. */
  demoMondayIso: string;
}
