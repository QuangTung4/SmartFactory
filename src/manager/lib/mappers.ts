import type { ApiDayKpis, ApiIncident } from "@/lib/api";
import type { DayKpis, TaskIncidentView } from "@/lib/manager-store";
import type { ResultStatus, ShiftId } from "@/types/inspection";
import { shiftLabel as localizeShift } from "@/i18n/contentLabels";
import type { AppLocale } from "@/i18n/locales";

export function mapStatus(s: string): ResultStatus {
  const u = s.toUpperCase();
  if (u === "OK") return "ok";
  if (u === "MISSING") return "missed";
  return "ng";
}

export function mapShift(s: string): ShiftId {
  return s?.toUpperCase() === "NIGHT" ? "night" : "day";
}

export function mapIncident(row: ApiIncident): TaskIncidentView {
  return {
    incidentId: String(row.incidentId),
    checkId: String(row.checkId),
    deviceId: String(row.machineId),
    deviceCode: row.deviceCode,
    deviceName: row.deviceName,
    zoneCode: row.zoneCode,
    zoneName: row.zoneName || row.zoneCode,
    status: mapStatus(row.status),
    reason: row.reason,
    imageUrls: row.imageUrls?.length
      ? row.imageUrls
      : row.imageUrl
        ? [row.imageUrl]
        : [],
    checkedBy: row.checkedBy,
    checkedAt: row.checkedAt || new Date().toISOString(),
    shift: mapShift(row.shift),
    sessionDate: row.sessionDate || "",
    incidentStatus: row.incidentStatus,
    resolvedAt: row.resolvedAt,
    checkPass: row.checkPass || "worker",
  };
}

export function mapKpis(row: ApiDayKpis, locale: AppLocale): DayKpis {
  return {
    sessionDate: row.sessionDate,
    shift: mapShift(row.shift),
    shiftLabel: localizeShift(row.shift || row.shiftLabel, locale),
    total: row.total,
    ok: row.ok,
    ng: row.ng,
    missing: row.missing,
    pending: row.pending,
    compliance: row.compliance,
  };
}

export const emptyKpis: DayKpis = {
  sessionDate: "",
  shift: "day",
  shiftLabel: "—",
  total: 0,
  ok: 0,
  ng: 0,
  missing: 0,
  pending: 0,
  compliance: 0,
};
