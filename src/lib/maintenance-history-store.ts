import type { MaintenanceHistoryRecord } from "@/types/inspection";

const STORAGE_KEY = "maintenance_history_v1";

function readAll(): MaintenanceHistoryRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(rows: MaintenanceHistoryRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export function listMaintenanceHistory(): MaintenanceHistoryRecord[] {
  return readAll();
}

export function listHistoryBySession(sessionDate: string, shift: string): MaintenanceHistoryRecord[] {
  return readAll().filter((r) => r.session_date === sessionDate && r.shift === shift);
}

export function hasHistoryForDevice(
  sessionDate: string,
  shift: string,
  deviceId: string
): boolean {
  return readAll().some(
    (r) => r.session_date === sessionDate && r.shift === shift && r.device_id === deviceId
  );
}

export function appendMaintenanceHistory(record: MaintenanceHistoryRecord): void {
  const rows = readAll();
  const idx = rows.findIndex(
    (r) =>
      r.session_date === record.session_date &&
      r.shift === record.shift &&
      r.device_id === record.device_id
  );
  if (idx >= 0) {
    rows[idx] = record;
  } else {
    rows.push(record);
  }
  writeAll(rows);
}

export function appendManyMaintenanceHistory(records: MaintenanceHistoryRecord[]): void {
  for (const r of records) appendMaintenanceHistory(r);
}

export function clearMaintenanceHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
