import type { MaintenanceHistoryRecord, ResultStatus, ShiftId } from "@/types/inspection";
import { devices } from "@/data/mockData";
import { formatSessionDate, getShiftContext, resolveNow } from "@/lib/shift-window";
import { listMaintenanceHistory } from "@/lib/maintenance-history-store";

export type IncidentStatus = "pending" | "processing" | "resolved";

export type TaskIncidentView = {
  incidentId: string;
  checkId: string;
  deviceId: string;
  deviceCode: string;
  deviceName: string;
  zoneCode?: string;
  zoneName: string;
  status: ResultStatus;
  reason: string;
  imageUrls: string[];
  checkedBy: string | null;
  checkedAt: string;
  shift: ShiftId;
  sessionDate: string;
  incidentStatus: IncidentStatus;
  resolvedAt: string | null;
};

export type ChatMessage = {
  id: string;
  sender: "admin" | "tablet" | "system";
  senderName: string;
  text: string;
  createdAt: string;
  /** bản dịch cache giả lập (MessageTranslations) */
  translations?: Partial<Record<"vi" | "en" | "ko", string>>;
};

const INCIDENT_KEY = "sf_incidents_v1";
const CHAT_KEY = "sf_chats_v1";

function readIncidents(): TaskIncidentView[] {
  try {
    const raw = localStorage.getItem(INCIDENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeIncidents(rows: TaskIncidentView[]) {
  localStorage.setItem(INCIDENT_KEY, JSON.stringify(rows));
}

function readChats(): Record<string, ChatMessage[]> {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeChats(map: Record<string, ChatMessage[]>) {
  localStorage.setItem(CHAT_KEY, JSON.stringify(map));
}

/** Seed demo nếu chưa có dữ liệu — để admin UI xem được ngay */
export function ensureManagerDemoData(): void {
  const existing = readIncidents();
  if (existing.length > 0) return;

  const ctx = getShiftContext(resolveNow());
  const now = new Date().toISOString();

  const demo: TaskIncidentView[] = [
    {
      incidentId: "inc-demo-1",
      checkId: "chk-demo-1",
      deviceId: "2",
      deviceCode: "TB2",
      deviceName: "TB2",
      zoneName: "BP1",
      status: "ng",
      reason: "TB2: tieng on bat thuong / rung manh khi chay thu.",
      imageUrls: [],
      checkedBy: "Nguyen Van A",
      checkedAt: now,
      shift: ctx.shift.id,
      sessionDate: ctx.sessionDate,
      incidentStatus: "pending",
      resolvedAt: null,
    },
    {
      incidentId: "inc-demo-2",
      checkId: "chk-demo-2",
      deviceId: "4",
      deviceCode: "TB4",
      deviceName: "TB4",
      zoneName: "BP2",
      status: "ng",
      reason: "TB4: den bao loi HMI nhap nhay do - nghi cam bien.",
      imageUrls: [],
      checkedBy: "Tran Van B",
      checkedAt: now,
      shift: ctx.shift.id,
      sessionDate: ctx.sessionDate,
      incidentStatus: "processing",
      resolvedAt: null,
    },
  ];

  writeIncidents(demo);
  writeChats({
    "inc-demo-1": [
      {
        id: "m1",
        sender: "system",
        senderName: "System",
        text: "Task Incident created from NG — TB2",
        createdAt: now,
      },
      {
        id: "m2",
        sender: "tablet",
        senderName: "Nguyen Van A",
        text: "TB2: tieng keu la o vong bi, da dung may.",
        createdAt: now,
        translations: {
          ko: "[KO] TB2 unusual bearing noise — machine stopped.",
          en: "[EN] TB2 unusual bearing noise — machine stopped.",
        },
      },
    ],
    "inc-demo-2": [
      {
        id: "m3",
        sender: "system",
        senderName: "System",
        text: "Task Incident — TB4",
        createdAt: now,
      },
    ],
  });
}

/** Đồng bộ sự cố NG từ maintenance_history (tablet đã gửi) */
export function syncNgFromHistory(): void {
  const history = listMaintenanceHistory().filter((r) => r.status === "ng");
  const incidents = readIncidents();
  let changed = false;

  for (const h of history) {
    if (incidents.some((i) => i.checkId === h.id)) continue;
    const device = devices.find((d) => d.id === h.device_id);
    const checkedByMatch = h.reason?.match(/CheckedBy:\s*(.+)$/m);
    incidents.push({
      incidentId: `inc-${h.id}`,
      checkId: h.id,
      deviceId: h.device_id,
      deviceCode: device?.code ?? h.device_id,
      deviceName: h.device_name,
      zoneName: h.department_name,
      status: "ng",
      reason: (h.reason || "NG").replace(/\nCheckedBy:.*$/m, "").trim(),
      imageUrls: h.image_urls || [],
      checkedBy: checkedByMatch?.[1]?.trim() ?? null,
      checkedAt: h.checked_at,
      shift: h.shift,
      sessionDate: h.session_date,
      incidentStatus: "pending",
      resolvedAt: null,
    });
    changed = true;
  }

  if (changed) writeIncidents(incidents);
}

export function listIncidents(): TaskIncidentView[] {
  ensureManagerDemoData();
  syncNgFromHistory();
  return readIncidents().sort(
    (a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime()
  );
}

export function getIncident(id: string): TaskIncidentView | undefined {
  return listIncidents().find((i) => i.incidentId === id);
}

export function getChatMessages(incidentId: string): ChatMessage[] {
  return readChats()[incidentId] ?? [];
}

export function sendChatMessage(
  incidentId: string,
  text: string,
  sender: "admin" | "tablet" = "admin",
  senderName = "Quản lý"
): ChatMessage {
  const map = readChats();
  const msg: ChatMessage = {
    id: crypto.randomUUID(),
    sender,
    senderName,
    text,
    createdAt: new Date().toISOString(),
  };
  map[incidentId] = [...(map[incidentId] ?? []), msg];
  writeChats(map);

  // auto-open processing
  const incidents = readIncidents();
  const idx = incidents.findIndex((i) => i.incidentId === incidentId);
  if (idx >= 0 && incidents[idx].incidentStatus === "pending") {
    incidents[idx] = { ...incidents[idx], incidentStatus: "processing" };
    writeIncidents(incidents);
  }

  return msg;
}

/** Mock AI Translation — lưu vào translations cache */
export function translateMessage(
  incidentId: string,
  messageId: string,
  targetLang: "vi" | "en" | "ko"
): string | null {
  const map = readChats();
  const list = map[incidentId] ?? [];
  const msg = list.find((m) => m.id === messageId);
  if (!msg) return null;

  if (msg.translations?.[targetLang]) return msg.translations[targetLang]!;

  const mock: Record<string, string> = {
    ko: `[KO] ${msg.text}`,
    en: `[EN] ${msg.text}`,
    vi: msg.text,
  };
  const translated = mock[targetLang];
  msg.translations = { ...msg.translations, [targetLang]: translated };
  writeChats(map);
  return translated;
}

/** Xác nhận sửa xong — khóa chat, máy về trạng thái xanh */
export function resolveIncident(incidentId: string): TaskIncidentView | null {
  const incidents = readIncidents();
  const idx = incidents.findIndex((i) => i.incidentId === incidentId);
  if (idx < 0) return null;

  const now = new Date().toISOString();
  incidents[idx] = {
    ...incidents[idx],
    incidentStatus: "resolved",
    resolvedAt: now,
  };
  writeIncidents(incidents);

  const map = readChats();
  map[incidentId] = [
    ...(map[incidentId] ?? []),
    {
      id: crypto.randomUUID(),
      sender: "system",
      senderName: "Hệ thống",
      text: "Quản lý đã xác nhận SỬA XONG. Phòng chat đã khóa. Máy chuyển trạng thái bình thường (OK).",
      createdAt: now,
    },
  ];
  writeChats(map);

  return incidents[idx];
}

export type DayKpis = {
  sessionDate: string;
  shift: ShiftId;
  shiftLabel: string;
  total: number;
  ok: number;
  ng: number;
  missing: number;
  pending: number;
  compliance: number;
};

export function computeDayKpis(): DayKpis {
  const ctx = getShiftContext(resolveNow());
  const history = listMaintenanceHistory().filter(
    (r) => r.session_date === ctx.sessionDate && r.shift === ctx.shift.id
  );

  let ok = history.filter((r) => r.status === "ok").length;
  let ng = history.filter((r) => r.status === "ng").length;
  let missing = history.filter((r) => r.status === "missed").length;

  // Nếu chưa có history: dùng số máy + incidents demo
  const totalMachines = devices.length;
  if (history.length === 0) {
    const openNg = listIncidents().filter(
      (i) => i.sessionDate === ctx.sessionDate && i.incidentStatus !== "resolved"
    ).length;
    ng = Math.max(openNg, listIncidents().filter((i) => i.status === "ng").length);
    ok = Math.max(0, totalMachines - ng - 1);
    missing = Math.max(0, totalMachines - ok - ng);
  }

  const checked = ok + ng;
  const total = Math.max(totalMachines, ok + ng + missing);
  const compliance = total === 0 ? 0 : Math.round((checked / total) * 1000) / 10;

  return {
    sessionDate: ctx.sessionDate || formatSessionDate(new Date()),
    shift: ctx.shift.id,
    shiftLabel: ctx.shift.label,
    total,
    ok,
    ng,
    missing,
    pending: listIncidents().filter((i) => i.incidentStatus !== "resolved").length,
    compliance,
  };
}

export function historyToRows(): MaintenanceHistoryRecord[] {
  return listMaintenanceHistory();
}
