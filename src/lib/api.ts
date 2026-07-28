/** Client REST → SmartFactory API (SQL Server) */

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "";

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  }
  return data as T;
}

export type ApiLoginResult = {
  userId: number;
  username: string;
  userType: string;
  permissionTier?: string;
  zoneId: number | null;
  zoneCode: string | null;
  zoneName: string | null;
};

export type ApiDayKpis = {
  sessionDate: string;
  shiftId: number;
  shift: string;
  shiftLabel: string;
  total: number;
  ok: number;
  ng: number;
  missing: number;
  pending: number;
  compliance: number;
};

export type ApiIncident = {
  incidentId: number;
  checkId: number;
  machineId: number;
  deviceCode: string;
  deviceName: string;
  zoneCode: string;
  zoneName: string;
  status: string;
  reason: string;
  imageUrl?: string;
  imageUrls: string[];
  checkedBy: string | null;
  checkedAt: string | null;
  shift: string;
  sessionDate: string | null;
  incidentStatus: "pending" | "processing" | "resolved";
  resolvedAt: string | null;
};

export type ApiChatMessage = {
  id: string;
  text: string;
  sender: "admin" | "tablet" | "system" | string;
  senderName: string;
  createdAt: string | null;
  /** Ngôn ngữ lúc soạn tin (vi|en|ko) */
  sourceLang?: "vi" | "en" | "ko" | null;
  translations?: Partial<Record<"vi" | "en" | "ko", string>>;
  messageType?: "text" | "image" | "system" | string;
  mediaUrl?: string | null;
};

export type ApiConversation = {
  conversationId: string;
  conversationKind?: "incident" | "direct" | string;
  /** Null for direct M↔CEO chats */
  incidentId: string | null;
  isActive: boolean;
  /** Open room: active + not resolved (server sort key). */
  isOpen?: boolean;
  incidentStatus: "pending" | "processing" | "resolved" | "open" | "closed" | string;
  reason: string;
  deviceCode: string;
  deviceName: string;
  zoneId?: string | null;
  zoneCode: string | null;
  zoneName: string | null;
  checkedBy: string | null;
  checkPass?: string | null;
  tabletUsername: string | null;
  peerUsername?: string | null;
  peerUserType?: string | null;
  displayName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  /** max(lastMessageAt, SubmittedAt) — newest activity / error first */
  lastActivityAt?: string | null;
  messageCount: number;
  /** Tin từ người khác chưa đọc (theo userId khi gọi API) */
  unreadCount?: number;
};

export type ApiReportMachine = {
  machineId: number;
  deviceCode: string;
  deviceName: string;
  machineStatus: string | null;
  zoneId: number;
  zoneCode: string;
  zoneName: string;
  checkId: string | null;
  checkStatus: string | null;
  reportStatus: "unchecked" | "missing" | "ng" | "ok";
  checkedBy: string | null;
  checkedAt: string | null;
  incidentId: string | null;
  incidentStatus: string | null;
  reason: string | null;
};

export type ApiReportMachinesResponse = {
  summary: {
    total: number;
    unchecked: number;
    missing: number;
    ng: number;
    ok: number;
    formOpen: boolean;
    sessionDate: string;
    shiftId: number | null;
    shiftCode: string | null;
    shiftLabel: string | null;
    formDeadlineTime: string | null;
    isToday?: boolean;
  };
  machines: ApiReportMachine[];
};

export type ApiReportRangeResponse = {
  summary: {
    from: string;
    to: string;
    shift: "DAY" | "NIGHT" | null;
    shiftCode: string | null;
    shiftLabel: string | null;
    ok: number;
    ng: number;
    missing: number;
    unchecked: number;
    total: number;
    compliance: number;
    dayCount: number;
  };
  byDay: Array<{
    date: string;
    ok: number;
    ng: number;
    missing: number;
    unchecked: number;
    shiftCode: string | null;
  }>;
  byZone: Array<{
    zoneCode: string;
    zoneName: string;
    ok: number;
    ng: number;
    missing: number;
    unchecked: number;
    total: number;
  }>;
  days: ApiReportMachinesResponse[];
};

export type ApiDashboardStats = {
  from: string;
  to: string;
  grain: "day" | "week" | "month";
  totals: {
    ok: number;
    ng: number;
    missing: number;
    total: number;
    compliance: number;
  };
  series: Array<{ bucket: string; ok: number; ng: number; missing: number }>;
  byZone: Array<{
    zoneCode: string;
    zoneName: string;
    ok: number;
    ng: number;
    missing: number;
    total: number;
  }>;
  incidentsByStatus: {
    pending: number;
    processing: number;
    resolved: number;
  };
};

export type ApiInspectionLogRow = {
  checkId: string;
  sessionDate: string;
  deviceCode: string;
  deviceName: string;
  zoneCode: string;
  zoneName: string;
  checkStatus: string;
  checkedBy: string | null;
  checkedAt: string | null;
  shiftCode: string;
  shiftLabel: string;
  reason: string | null;
};

export const api = {
  health: () => request<{ ok: boolean; db?: string }>("/api/health"),

  login: (username: string, password: string) =>
    request<ApiLoginResult>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  managerKpis: () => request<ApiDayKpis>("/api/manager/kpis"),

  zones: (userId?: number) => {
    const q = userId ? `?userId=${userId}` : "";
    return request<{ id: number; code: string; name: string }[]>(`/api/zones${q}`);
  },

  managerIncidents: (date?: string, userId?: number) => {
    const q = new URLSearchParams();
    if (date) q.set("date", date);
    if (userId) q.set("userId", String(userId));
    const qs = q.toString();
    return request<ApiIncident[]>(
      qs ? `/api/manager/incidents?${qs}` : "/api/manager/incidents"
    );
  },

  managerReportMachines: (date?: string, shift?: "DAY" | "NIGHT") => {
    const q = new URLSearchParams();
    if (date) q.set("date", date);
    if (shift) q.set("shift", shift);
    const qs = q.toString();
    return request<ApiReportMachinesResponse>(
      qs ? `/api/manager/report-machines?${qs}` : "/api/manager/report-machines"
    );
  },

  managerReportRange: (from: string, to: string, shift?: "DAY" | "NIGHT") => {
    const q = new URLSearchParams({ from, to });
    if (shift) q.set("shift", shift);
    return request<ApiReportRangeResponse>(`/api/manager/report-range?${q.toString()}`);
  },

  managerDashboardStats: (from: string, to: string, grain: "day" | "week" | "month") =>
    request<ApiDashboardStats>(
      `/api/manager/dashboard-stats?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&grain=${encodeURIComponent(grain)}`
    ),

  managerInspectionLog: (from: string, to: string) =>
    request<ApiInspectionLogRow[]>(
      `/api/manager/inspection-log?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    ),

  finalizeShift: () =>
    request<{ ok: boolean; inserted: number; skipped: boolean; reason?: string }>(
      "/api/checks/finalize-shift",
      { method: "POST", body: JSON.stringify({}) }
    ),

  managerConversations: (userId?: number) => {
    const q = userId != null ? `?userId=${encodeURIComponent(String(userId))}` : "";
    return request<ApiConversation[]>(`/api/manager/conversations${q}`);
  },

  markChatRead: (
    userId: number,
    opts: { incidentId?: string | number; conversationId?: string | number }
  ) =>
    request<{ ok: boolean }>("/api/chat/mark-read", {
      method: "POST",
      body: JSON.stringify({
        userId,
        incidentId: opts.incidentId,
        conversationId: opts.conversationId,
      }),
    }),

  managerMessages: (incidentId: string | number) =>
    request<ApiChatMessage[]>(`/api/manager/incidents/${incidentId}/messages`),

  conversationMessages: (conversationId: string | number, userId: number) =>
    request<ApiChatMessage[]>(
      `/api/manager/conversations/${conversationId}/messages?userId=${encodeURIComponent(String(userId))}`
    ),

  sendManagerMessage: (
    incidentId: string | number,
    text: string,
    userId?: number,
    sourceLang?: "vi" | "en" | "ko",
    opts?: { messageType?: "text" | "image"; mediaUrl?: string }
  ) =>
    request<ApiChatMessage>(`/api/manager/incidents/${incidentId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        text,
        userId,
        sourceLang,
        messageType: opts?.messageType || "text",
        mediaUrl: opts?.mediaUrl,
      }),
    }),

  sendConversationMessage: (
    conversationId: string | number,
    text: string,
    userId: number,
    sourceLang?: "vi" | "en" | "ko",
    opts?: { messageType?: "text" | "image"; mediaUrl?: string }
  ) =>
    request<ApiChatMessage>(`/api/manager/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        text,
        userId,
        sourceLang,
        messageType: opts?.messageType || "text",
        mediaUrl: opts?.mediaUrl,
      }),
    }),

  directPeers: (userId: number) =>
    request<Array<{ userId: number; username: string; userType: string }>>(
      `/api/chat/direct-peers?userId=${encodeURIComponent(String(userId))}`
    ),

  createDirectChat: (userId: number, peerUserId: number) =>
    request<{
      conversationId: string;
      conversationKind: string;
      peerUserId: number;
      peerUsername: string;
      peerUserType: string;
    }>("/api/chat/direct", {
      method: "POST",
      body: JSON.stringify({ userId, peerUserId }),
    }),

  uploadChatImage: async (file: Blob, filename = "chat.jpg") => {
    const form = new FormData();
    form.append("image", file, filename);
    const res = await fetch(apiUrl("/api/chat/upload"), {
      method: "POST",
      body: form,
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      url?: string;
      mediaUrl?: string;
    };
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    const mediaUrl = data.mediaUrl || data.url;
    if (!mediaUrl) throw new Error("Upload không trả mediaUrl");
    return { mediaUrl, url: mediaUrl };
  },

  translateMessage: (messageId: string | number, targetLang: "vi" | "en" | "ko") =>
    request<{
      messageId: string;
      targetLang: string;
      translatedText: string;
      text: string;
      translations: Partial<Record<"vi" | "en" | "ko", string>>;
    }>(`/api/manager/messages/${messageId}/translate`, {
      method: "POST",
      body: JSON.stringify({ targetLang }),
    }),

  resolveIncident: (incidentId: string | number) =>
    request<{ ok: boolean }>(`/api/manager/incidents/${incidentId}/resolve`, {
      method: "POST",
      body: JSON.stringify({}),
    }),

  pushVapidPublicKey: () =>
    request<{ publicKey: string }>("/api/push/vapid-public-key"),

  registerPush: (body: {
    userId: number;
    platform: "web" | "android";
    token: string;
    endpoint?: string;
    p256dh?: string;
    auth?: string;
  }) =>
    request<{ ok: boolean }>("/api/push/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
