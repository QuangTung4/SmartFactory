export type ShiftId = "day" | "night";

export type ResultStatus = "ok" | "ng" | "missed";

export type DeviceWorkStatus = "todo" | "draft" | "submitted" | "missed";

export type SyncedFrom = "early_submit" | "deadline_flush";

export type MaintenanceHistoryRecord = {
  id: string;
  checked_at: string;
  device_id: string;
  device_name: string;
  department_id: string;
  department_name: string;
  status: ResultStatus;
  reason: string | null;
  image_urls: string[];
  shift: ShiftId;
  session_date: string;
  synced_from: SyncedFrom;
};

export type InspectionAnswer = {
  value: "pass" | "fail" | "na" | null;
  note?: string;
  photos?: string[];
};

export type DeviceInspectionState = {
  deviceId: string;
  status: DeviceWorkStatus;
  answers?: Record<string, InspectionAnswer>;
  evidencePhotos?: string[];
  generalNote?: string;
  resultStatus?: ResultStatus;
  submittedAt?: string;
  lastCheck?: string;
  progress?: number;
};

export type InspectionSessionMeta = {
  sessionKey: string;
  sessionDate: string;
  shift: ShiftId;
  syncedAt: string | null;
  deviceIds: string[];
};
