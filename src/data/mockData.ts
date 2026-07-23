export type Zone = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

/** @deprecated dùng Zone — giữ alias để tương thích import cũ */
export type Department = Zone;

export type DeviceStatus = "todo" | "draft" | "submitted" | "missed";

export type Device = {
  id: string;
  code: string;
  name: string;
  location: string;
  zoneId?: string;
  status: DeviceStatus;
  lastCheck?: string;
  progress?: number;
};

export type AnswerValue = "pass" | "fail" | "na" | null;

export type Question = {
  id: string;
  text: string;
  hint?: string;
};

export type ChecklistGroup = {
  id: string;
  title: string;
  questions: Question[];
};

export type Checklist = {
  deviceId: string;
  groups: ChecklistGroup[];
};

const ZONE_STYLES: { icon: string; color: string }[] = [
  { icon: "Factory", color: "hsl(205 66% 34%)" },
  { icon: "Wrench", color: "hsl(25 90% 50%)" },
  { icon: "Zap", color: "hsl(45 100% 45%)" },
  { icon: "BadgeCheck", color: "hsl(280 60% 50%)" },
  { icon: "ShieldCheck", color: "hsl(134 61% 41%)" },
  { icon: "Forklift", color: "hsl(195 70% 45%)" },
  { icon: "Factory", color: "hsl(210 40% 40%)" },
  { icon: "Wrench", color: "hsl(18 70% 45%)" },
  { icon: "Zap", color: "hsl(230 45% 50%)" },
  { icon: "ShieldCheck", color: "hsl(170 60% 35%)" },
];

/** Zones BP1–BP10 — khớp seed DB */
export const zones: Zone[] = Array.from({ length: 10 }, (_, i) => {
  const n = i + 1;
  const style = ZONE_STYLES[i];
  return { id: `BP${n}`, name: `Bộ phận ${n}`, icon: style.icon, color: style.color };
});

/** Alias — code cũ dùng departments */
export const departments = zones;

/** 50 thiết bị, 5 máy / bộ phận — khớp seed DB */
export const devices: Device[] = Array.from({ length: 50 }, (_, i) => {
  const n = i + 1;
  const zoneN = Math.ceil(n / 5);
  return {
    id: String(n),
    code: `TB${n}`,
    name: `Thiết bị ${n}`,
    location: `Bộ phận ${zoneN}`,
    zoneId: `BP${zoneN}`,
    status: "todo" as DeviceStatus,
  };
});

export const sampleChecklist: Checklist = {
  deviceId: "d3",
  groups: [
    {
      id: "g1",
      title: "I. Hệ thống an toàn",
      questions: [
        { id: "q1", text: "Kiểm tra nút dừng khẩn cấp (E-Stop)", hint: "Nhấn thử và xác nhận hệ thống dừng < 1s" },
        { id: "q2", text: "Cảm biến an toàn vùng nguy hiểm hoạt động" },
        { id: "q3", text: "Còi và đèn cảnh báo còn nguyên vẹn" },
      ],
    },
    {
      id: "g2",
      title: "II. Vận hành",
      questions: [
        { id: "q4", text: "Máy khởi động êm, không tiếng ồn bất thường" },
        { id: "q5", text: "Áp suất / nhiệt độ trong ngưỡng" },
        { id: "q6", text: "Không rò rỉ dầu / khí" },
      ],
    },
  ],
};
