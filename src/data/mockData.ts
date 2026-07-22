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

/** Zones — ZoneCode BP1..; ZoneName NVARCHAR tiếng Việt */
export const zones: Zone[] = [
  { id: "BP1", name: "Bộ phận 1", icon: "Factory", color: "hsl(205 66% 34%)" },
  { id: "BP2", name: "Bộ phận 2", icon: "Wrench", color: "hsl(25 90% 50%)" },
  { id: "BP3", name: "Bộ phận 3", icon: "Zap", color: "hsl(45 100% 45%)" },
  { id: "BP4", name: "Bộ phận 4", icon: "BadgeCheck", color: "hsl(280 60% 50%)" },
  { id: "BP5", name: "Bộ phận 5", icon: "ShieldCheck", color: "hsl(134 61% 41%)" },
  { id: "BP6", name: "Bộ phận 6", icon: "Forklift", color: "hsl(195 70% 45%)" },
];

/** Alias — code cũ dùng departments */
export const departments = zones;

export const devices: Device[] = [
  { id: "1", code: "TB1", name: "Thiết bị 1", location: "Bộ phận 1", zoneId: "BP1", status: "todo" },
  { id: "2", code: "TB2", name: "Thiết bị 2", location: "Bộ phận 1", zoneId: "BP1", status: "todo" },
  { id: "3", code: "TB3", name: "Thiết bị 3", location: "Bộ phận 2", zoneId: "BP2", status: "todo" },
  { id: "4", code: "TB4", name: "Thiết bị 4", location: "Bộ phận 2", zoneId: "BP2", status: "todo" },
  { id: "5", code: "TB5", name: "Thiết bị 5", location: "Bộ phận 3", zoneId: "BP3", status: "todo" },
  { id: "6", code: "TB6", name: "Thiết bị 6", location: "Bộ phận 3", zoneId: "BP3", status: "todo" },
  { id: "7", code: "TB7", name: "Thiết bị 7", location: "Bộ phận 4", zoneId: "BP4", status: "todo" },
  { id: "8", code: "TB8", name: "Thiết bị 8", location: "Bộ phận 4", zoneId: "BP4", status: "todo" },
  { id: "9", code: "TB9", name: "Thiết bị 9", location: "Bộ phận 5", zoneId: "BP5", status: "todo" },
  { id: "10", code: "TB10", name: "Thiết bị 10", location: "Bộ phận 5", zoneId: "BP5", status: "todo" },
  { id: "11", code: "TB11", name: "Thiết bị 11", location: "Bộ phận 6", zoneId: "BP6", status: "todo" },
  { id: "12", code: "TB12", name: "Thiết bị 12", location: "Bộ phận 6", zoneId: "BP6", status: "todo" },
];

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
      title: "II. Cơ khí & Truyền động",
      questions: [
        { id: "q4", text: "Kiểm tra độ căng dây đai" },
        { id: "q5", text: "Bôi trơn vòng bi & khớp nối" },
        { id: "q6", text: "Bulông cố định không lỏng" },
        { id: "q7", text: "Không có tiếng ồn lạ khi vận hành thử" },
      ],
    },
    {
      id: "g3",
      title: "III. Điện & Điều khiển",
      questions: [
        { id: "q8", text: "Tủ điện sạch, không ẩm mốc" },
        { id: "q9", text: "Đầu nối cáp chắc chắn, không cháy xém" },
        { id: "q10", text: "Đèn báo trạng thái HMI hiển thị đúng" },
      ],
    },
    {
      id: "g4",
      title: "IV. Vệ sinh & Môi trường",
      questions: [
        { id: "q11", text: "Khu vực máy sạch, không rò dầu" },
        { id: "q12", text: "Thùng chứa chất thải đúng nơi quy định" },
      ],
    },
  ],
};
