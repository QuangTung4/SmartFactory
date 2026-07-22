import type { ShiftId } from "@/types/inspection";

export type TimeOfDay = { h: number; m: number };

export type ShiftDefinition = {
  id: ShiftId;
  label: string;
  workStart: TimeOfDay;
  workEnd: TimeOfDay;
  /** workStart − 1h */
  submitOpen: TimeOfDay;
  submitDeadline: TimeOfDay;
  /** workEnd crosses midnight */
  crossesMidnight: boolean;
};

export const SHIFTS: Record<ShiftId, ShiftDefinition> = {
  day: {
    id: "day",
    label: "Ca sáng",
    workStart: { h: 8, m: 0 },
    workEnd: { h: 18, m: 40 },
    submitOpen: { h: 7, m: 0 },
    submitDeadline: { h: 8, m: 30 },
    crossesMidnight: false,
  },
  night: {
    id: "night",
    label: "Ca đêm",
    workStart: { h: 20, m: 0 },
    workEnd: { h: 5, m: 30 },
    submitOpen: { h: 19, m: 0 },
    submitDeadline: { h: 20, m: 30 },
    crossesMidnight: true,
  },
};

export type ShiftPhase = "before_open" | "submit_open" | "locked";

export type ShiftContext = {
  now: Date;
  shift: ShiftDefinition;
  sessionDate: string;
  sessionKey: string;
  phase: ShiftPhase;
  canSubmit: boolean;
  openAt: Date;
  deadlineAt: Date;
  /** ms until deadline when open; until open when before; 0 when locked */
  msRemaining: number;
  label: string;
};

const TZ = "Asia/Ho_Chi_Minh";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Format YYYY-MM-DD in local (VN) calendar sense using the Date's local parts */
export function formatSessionDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function sessionKey(sessionDate: string, shift: ShiftId): string {
  return `${sessionDate}_${shift}`;
}

function atTimeOnDate(base: Date, t: TimeOfDay): Date {
  const d = new Date(base);
  d.setHours(t.h, t.m, 0, 0);
  return d;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

/** Night session date: calendar day when night starts (19:00–23:59 same day; 00:00–05:30 → previous day) */
export function resolveNightSessionDate(now: Date): string {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const workEndMin = SHIFTS.night.workEnd.h * 60 + SHIFTS.night.workEnd.m;
  if (minutes < workEndMin) {
    return formatSessionDate(addDays(now, -1));
  }
  return formatSessionDate(now);
}

export function getSessionDateForShift(now: Date, shiftId: ShiftId): string {
  if (shiftId === "night") return resolveNightSessionDate(now);
  return formatSessionDate(now);
}

function buildWindow(sessionDate: string, shift: ShiftDefinition) {
  const [y, m, d] = sessionDate.split("-").map(Number);
  const base = new Date(y, m - 1, d, 12, 0, 0, 0);
  const openAt = atTimeOnDate(base, shift.submitOpen);
  const deadlineAt = atTimeOnDate(base, shift.submitDeadline);
  return { openAt, deadlineAt };
}

/**
 * Pick the shift context for UI / submit lock.
 * Prefer an active submit window; else the most recent locked window of today/tonight;
 * else the next upcoming open window.
 */
export function getShiftContext(now: Date = new Date()): ShiftContext {
  const dayDate = formatSessionDate(now);
  const nightDate = resolveNightSessionDate(now);

  const candidates: { shift: ShiftDefinition; sessionDate: string }[] = [
    { shift: SHIFTS.day, sessionDate: dayDate },
    { shift: SHIFTS.night, sessionDate: nightDate },
  ];

  // Also consider tomorrow's day window for "before_open" late night after night deadline
  const tomorrow = formatSessionDate(addDays(now, 1));
  if (now.getHours() >= 21 || (now.getHours() === 20 && now.getMinutes() > 30)) {
    candidates.push({ shift: SHIFTS.day, sessionDate: tomorrow });
  }

  type Scored = ShiftContext & { score: number };
  const scored: Scored[] = [];

  for (const c of candidates) {
    const { openAt, deadlineAt } = buildWindow(c.sessionDate, c.shift);
    let phase: ShiftPhase;
    let canSubmit = false;
    let msRemaining = 0;
    let label: string;
    let score = 0;

    if (now >= openAt && now <= deadlineAt) {
      phase = "submit_open";
      canSubmit = true;
      msRemaining = deadlineAt.getTime() - now.getTime();
      label = `${c.shift.label}: đang mở gửi · khóa lúc ${pad2(c.shift.submitDeadline.h)}:${pad2(c.shift.submitDeadline.m)}`;
      score = 300;
    } else if (now < openAt) {
      phase = "before_open";
      msRemaining = openAt.getTime() - now.getTime();
      label = `${c.shift.label}: mở gửi lúc ${pad2(c.shift.submitOpen.h)}:${pad2(c.shift.submitOpen.m)}`;
      score = 100 - Math.min(99, Math.floor(msRemaining / 60000));
    } else {
      // locked after deadline — still relevant until next shift's open
      phase = "locked";
      msRemaining = 0;
      label = `${c.shift.label}: đã khóa gửi (deadline ${pad2(c.shift.submitDeadline.h)}:${pad2(c.shift.submitDeadline.m)})`;
      const age = now.getTime() - deadlineAt.getTime();
      // Prefer recently locked (within ~12h)
      score = age >= 0 && age < 12 * 60 * 60 * 1000 ? 200 - Math.floor(age / 60000) : 10;
    }

    scored.push({
      now,
      shift: c.shift,
      sessionDate: c.sessionDate,
      sessionKey: sessionKey(c.sessionDate, c.shift.id),
      phase,
      canSubmit,
      openAt,
      deadlineAt,
      msRemaining,
      label,
      score,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  const { score: _s, ...ctx } = best;
  return ctx;
}

export function isSubmitAllowed(now: Date = new Date()): boolean {
  return getShiftContext(now).canSubmit;
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  return `${pad2(m)}:${pad2(s)}`;
}

/**
 * Resolve clock: real now, or ?mockTime=YYYY-MM-DDTHH:mm / HH:mm / ISO
 */
export function resolveNow(search: string = typeof window !== "undefined" ? window.location.search : ""): Date {
  const params = new URLSearchParams(search);
  const raw = params.get("mockTime");
  if (!raw) return new Date();

  // HH:mm or H:mm → today
  if (/^\d{1,2}:\d{2}$/.test(raw)) {
    const [hh, mm] = raw.split(":").map(Number);
    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    return d;
  }

  // YYYY-MM-DDTHH:mm
  if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}$/.test(raw)) {
    const [datePart, timePart] = raw.split("T");
    const [y, mo, da] = datePart.split("-").map(Number);
    const [hh, mm] = timePart.split(":").map(Number);
    return new Date(y, mo - 1, da, hh, mm, 0, 0);
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return new Date();
}

export { TZ };
