import { devices } from "@/data/mockData";
import {
  appendMaintenanceHistory,
  appendManyMaintenanceHistory,
  hasHistoryForDevice,
  listHistoryBySession,
} from "@/lib/maintenance-history-store";
import type {
  DeviceInspectionState,
  DeviceWorkStatus,
  InspectionSessionMeta,
  MaintenanceHistoryRecord,
  ResultStatus,
  ShiftId,
} from "@/types/inspection";

const SESSION_PREFIX = "inspection_session_v1_";

function storageKey(sessionKey: string) {
  return `${SESSION_PREFIX}${sessionKey}`;
}

function emptyDeviceState(deviceId: string): DeviceInspectionState {
  return { deviceId, status: "todo" };
}

export function loadSession(sessionKey: string): InspectionSessionMeta & {
  devices: Record<string, DeviceInspectionState>;
} {
  try {
    const raw = localStorage.getItem(storageKey(sessionKey));
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    /* fall through */
  }

  const [sessionDate, shift] = sessionKey.split("_") as [string, ShiftId];
  const deviceMap: Record<string, DeviceInspectionState> = {};
  for (const d of devices) {
    deviceMap[d.id] = emptyDeviceState(d.id);
  }
  return {
    sessionKey,
    sessionDate,
    shift,
    syncedAt: null,
    deviceIds: devices.map((d) => d.id),
    devices: deviceMap,
  };
}

function saveSession(
  session: InspectionSessionMeta & { devices: Record<string, DeviceInspectionState> }
) {
  localStorage.setItem(storageKey(session.sessionKey), JSON.stringify(session));
}

export function getDeviceState(sessionKey: string, deviceId: string): DeviceInspectionState {
  const session = loadSession(sessionKey);
  return session.devices[deviceId] ?? emptyDeviceState(deviceId);
}

export function upsertDeviceState(
  sessionKey: string,
  deviceId: string,
  patch: Partial<DeviceInspectionState>
): DeviceInspectionState {
  const session = loadSession(sessionKey);
  const prev = session.devices[deviceId] ?? emptyDeviceState(deviceId);
  const next = { ...prev, ...patch, deviceId };
  session.devices[deviceId] = next;
  saveSession(session);
  return next;
}

export function saveDraft(
  sessionKey: string,
  deviceId: string,
  data: {
    answers: DeviceInspectionState["answers"];
    evidencePhotos: string[];
    generalNote: string;
    progress: number;
  }
) {
  return upsertDeviceState(sessionKey, deviceId, {
    status: "draft",
    answers: data.answers,
    evidencePhotos: data.evidencePhotos,
    generalNote: data.generalNote,
    progress: data.progress,
    lastCheck: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
  });
}

function deriveResultStatus(state: DeviceInspectionState): ResultStatus {
  const answers = state.answers ?? {};
  const fails = Object.values(answers).filter((a) => a.value === "fail");
  if (fails.length > 0) return "ng";
  return "ok";
}

function collectNgDetails(state: DeviceInspectionState): { reason: string | null; image_urls: string[] } {
  const answers = state.answers ?? {};
  const failNotes: string[] = [];
  const images: string[] = [...(state.evidencePhotos ?? [])];

  for (const a of Object.values(answers)) {
    if (a.value !== "fail") continue;
    if (a.note?.trim()) failNotes.push(a.note.trim());
    if (a.photos?.length) images.push(...a.photos);
  }

  if (state.generalNote?.trim()) failNotes.push(state.generalNote.trim());

  return {
    reason: failNotes.length ? failNotes.join(" | ") : null,
    image_urls: images,
  };
}

export function earlySubmitToHistory(params: {
  sessionKey: string;
  deviceId: string;
  deviceName: string;
  departmentId: string;
  departmentName: string;
  answers: DeviceInspectionState["answers"];
  evidencePhotos: string[];
  generalNote: string;
}): MaintenanceHistoryRecord {
  const { sessionKey, deviceId, deviceName, departmentId, departmentName } = params;
  const session = loadSession(sessionKey);

  const state: DeviceInspectionState = {
    deviceId,
    status: "submitted",
    answers: params.answers,
    evidencePhotos: params.evidencePhotos,
    generalNote: params.generalNote,
    progress: 100,
    submittedAt: new Date().toISOString(),
    lastCheck: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
  };
  const resultStatus = deriveResultStatus(state);
  state.resultStatus = resultStatus;

  session.devices[deviceId] = state;
  saveSession(session);

  const ng = resultStatus === "ng" ? collectNgDetails(state) : { reason: null, image_urls: [] as string[] };

  const record: MaintenanceHistoryRecord = {
    id: crypto.randomUUID(),
    checked_at: new Date().toISOString(),
    device_id: deviceId,
    device_name: deviceName,
    department_id: departmentId,
    department_name: departmentName,
    status: resultStatus,
    reason: ng.reason,
    image_urls: ng.image_urls,
    shift: session.shift,
    session_date: session.sessionDate,
    synced_from: "early_submit",
  };

  appendMaintenanceHistory(record);
  return record;
}

/**
 * At deadline: mark remaining devices missed, write ALL devices into maintenance_history,
 * set session.syncedAt. Idempotent if already synced.
 */
export function finalizeAndFlushSession(params: {
  sessionKey: string;
  departmentId: string;
  departmentName: string;
  now?: Date;
}): { synced: boolean; count: number; alreadySynced: boolean } {
  const { sessionKey, departmentId, departmentName } = params;
  const now = params.now ?? new Date();
  const session = loadSession(sessionKey);

  if (session.syncedAt) {
    return {
      synced: true,
      count: listHistoryBySession(session.sessionDate, session.shift).length,
      alreadySynced: true,
    };
  }

  const records: MaintenanceHistoryRecord[] = [];

  for (const deviceId of session.deviceIds) {
    if (hasHistoryForDevice(session.sessionDate, session.shift, deviceId)) {
      continue;
    }

    const device = devices.find((d) => d.id === deviceId);
    const state = session.devices[deviceId] ?? emptyDeviceState(deviceId);

    let status: ResultStatus;
    let reason: string | null = null;
    let image_urls: string[] = [];

    if (state.status === "submitted" && state.resultStatus && state.resultStatus !== "missed") {
      status = state.resultStatus;
      if (status === "ng") {
        const ng = collectNgDetails(state);
        reason = ng.reason;
        image_urls = ng.image_urls;
      }
    } else {
      status = "missed";
      session.devices[deviceId] = {
        ...state,
        status: "missed",
        resultStatus: "missed",
        lastCheck: now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };
    }

    records.push({
      id: crypto.randomUUID(),
      checked_at: now.toISOString(),
      device_id: deviceId,
      device_name: device?.name ?? deviceId,
      department_id: departmentId,
      department_name: departmentName,
      status,
      reason,
      image_urls,
      shift: session.shift,
      session_date: session.sessionDate,
      synced_from: "deadline_flush",
    });
  }

  if (records.length) appendManyMaintenanceHistory(records);

  for (const deviceId of session.deviceIds) {
    const st = session.devices[deviceId];
    if (!st || st.status === "todo" || st.status === "draft") {
      session.devices[deviceId] = {
        ...(st ?? emptyDeviceState(deviceId)),
        status: "missed",
        resultStatus: "missed",
      };
    }
  }

  session.syncedAt = now.toISOString();
  saveSession(session);

  const total = listHistoryBySession(session.sessionDate, session.shift).length;
  return { synced: true, count: total, alreadySynced: false };
}

export function getSessionDeviceStatuses(sessionKey: string): Record<string, DeviceWorkStatus> {
  const session = loadSession(sessionKey);
  const out: Record<string, DeviceWorkStatus> = {};
  for (const id of session.deviceIds) {
    out[id] = session.devices[id]?.status ?? "todo";
  }
  return out;
}
