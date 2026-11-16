// ShiftFix — written by IBM Bob
// Shared domain types for the cafe coverage demo.

export type EmployeeRole = "barista" | "cashier" | "manager";

export type CoverageStatus =
  | "open"
  | "offering"
  | "pending_approval"
  | "filled"
  | "escalated";

export type OfferStatus = "pending" | "accepted" | "declined" | "timed_out" | "skipped";

export type MessageChannel = "group" | "dm";

export type Actor = "agent" | "worker" | "manager";

export type Intent =
  | "call_out"
  | "accept"
  | "decline"
  | "question"
  | "other"
  | "confirm";

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
  reason: string;
  status: CoverageStatus;
  currentOfferId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Offer {
  id: string;
  requestId: string;
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
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  requestId: string | null;
  actor: Actor;
  action: string;
  reason: string;
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
  offers: Offer[];
  messages: Message[];
  auditEvents: AuditEvent[];
  /** Simulated clock used by offer timeouts / fast-forward. */
  nowIso: string;
  /** Demo week Monday used for the cafe seed. */
  demoMondayIso: string;
}
