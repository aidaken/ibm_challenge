// ShiftFix — written by IBM Bob
// Small time helpers for eligibility math (pure).

export function toDate(iso: string): Date {
  return new Date(iso);
}

export function minutesOfDay(iso: string): number {
  const d = toDate(iso);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

export function dayOfWeekUtc(iso: string): number {
  return toDate(iso).getUTCDay();
}

export function hoursBetween(startIso: string, endIso: string): number {
  return (toDate(endIso).getTime() - toDate(startIso).getTime()) / (1000 * 60 * 60);
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return toDate(aStart) < toDate(bEnd) && toDate(bStart) < toDate(aEnd);
}

/** Rest gap in hours between two shifts (0 if they overlap). */
export function restGapHours(
  shiftAStart: string,
  shiftAEnd: string,
  shiftBStart: string,
  shiftBEnd: string,
): number {
  if (rangesOverlap(shiftAStart, shiftAEnd, shiftBStart, shiftBEnd)) {
    return 0;
  }
  const aStart = toDate(shiftAStart).getTime();
  const aEnd = toDate(shiftAEnd).getTime();
  const bStart = toDate(shiftBStart).getTime();
  const bEnd = toDate(shiftBEnd).getTime();
  if (aEnd <= bStart) {
    return (bStart - aEnd) / (1000 * 60 * 60);
  }
  return (aStart - bEnd) / (1000 * 60 * 60);
}

export function formatShiftWindow(startIso: string, endIso: string): string {
  const fmt = (iso: string) => {
    const d = toDate(iso);
    let h = d.getUTCHours();
    const m = d.getUTCMinutes();
    const suffix = h >= 12 ? "pm" : "am";
    h = h % 12;
    if (h === 0) h = 12;
    return m === 0 ? `${h}${suffix}` : `${h}:${String(m).padStart(2, "0")}${suffix}`;
  };
  return `${fmt(startIso)} to ${fmt(endIso)}`;
}
