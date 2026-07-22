/**
 * Kiểu dữ liệu khớp schema SQL Server SmartFactoryDB
 * Nguồn: E:\ysData\db\factory.sql
 */

export type UserType = "admin" | "tablet";

export type MachineCurrentStatus = "normal" | "error" | "maintenance";

/** DailyChecks.CheckStatus */
export type CheckStatus = "OK" | "NG" | "MISSING";

export type IncidentStatus = "pending" | "processing" | "resolved";

export type MessageType = "text" | "system";

export type TargetLang = "vi" | "en" | "ko";

export type Zone = {
  ZoneId: number;
  ZoneCode: string;
  ZoneName: string;
};

export type Machine = {
  MachineId: number;
  MachineCode: string;
  MachineName: string;
  ZoneId: number;
  CurrentStatus: MachineCurrentStatus | null;
};

export type Shift = {
  ShiftId: number;
  ShiftCode: string;
  ShiftName: string;
  WorkStartTime: string; // TIME → "HH:mm:ss"
  WorkEndTime: string;
  FormOpenTime: string;
  FormDeadlineTime: string;
};

export type AppUser = {
  UserId: number;
  Username: string;
  PasswordHash: string;
  UserType: UserType;
  IsActive: boolean | null;
};

export type DailyCheck = {
  CheckId: number;
  CheckDate: string; // ISO date
  ShiftId: number;
  MachineId: number;
  EmployeeId: number | null;
  CheckedBy: string | null;
  CheckStatus: CheckStatus;
  SubmittedAt: string | null;
};

export type TaskIncident = {
  IncidentId: number;
  CheckId: number;
  ErrorDescription: string;
  IncidentImageUrl: string;
  IncidentStatus: IncidentStatus | null;
  ResolvedAt: string | null;
};

/** Map UI mock (ok/ng/missed) → DB CheckStatus */
export function toCheckStatus(ui: "ok" | "ng" | "missed"): CheckStatus {
  if (ui === "ok") return "OK";
  if (ui === "ng") return "NG";
  return "MISSING";
}

export function fromCheckStatus(db: CheckStatus): "ok" | "ng" | "missed" {
  if (db === "OK") return "ok";
  if (db === "NG") return "ng";
  return "missed";
}
