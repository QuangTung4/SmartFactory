import type { AppLocale } from "@/i18n/locales";

/** Ten bo phan theo ma BP1.. */
export function zoneLabel(zoneCode: string | null | undefined, locale: AppLocale, fallback?: string) {
  const code = (zoneCode || "").trim().toUpperCase();
  const m = code.match(/^BP(\d+)$/);
  if (m) {
    const n = m[1];
    if (locale === "en") return `Department ${n}`;
    if (locale === "ko") return `부서 ${n}`;
    return `Bộ phận ${n}`;
  }
  return fallback || zoneCode || "—";
}

/** Ten thiet bi theo ma TB1.. */
export function machineLabel(
  machineCode: string | null | undefined,
  locale: AppLocale,
  fallback?: string
) {
  const code = (machineCode || "").trim().toUpperCase();
  const m = code.match(/^TB(\d+)$/);
  if (m) {
    const n = m[1];
    if (locale === "en") return `Device ${n}`;
    if (locale === "ko") return `설비 ${n}`;
    return `Thiết bị ${n}`;
  }
  return fallback || machineCode || "—";
}

/** Ca / shift: DAY|NIGHT hoặc tên VN trong DB */
export function shiftLabel(
  shiftCodeOrName: string | null | undefined,
  locale: AppLocale
): string {
  const raw = String(shiftCodeOrName || "").trim();
  const u = raw.toUpperCase();
  const isNight =
    u === "NIGHT" ||
    /đêm|dem/i.test(raw) ||
    u.includes("NIGHT") ||
    raw.includes("야간");
  const isDay =
    u === "DAY" ||
    /sáng|sang|ngày|ngay/i.test(raw) ||
    u.includes("DAY") ||
    raw.includes("주간");

  if (isNight) {
    if (locale === "en") return "Night shift";
    if (locale === "ko") return "야간 교대";
    return "Ca đêm";
  }
  if (isDay || raw) {
    if (locale === "en") return "Day shift";
    if (locale === "ko") return "주간 교대";
    return "Ca sáng";
  }
  return "—";
}

type TriText = { vi: string; en: string; ko: string };

/** Glossary — dung {code} cho ly do NG theo tung may */
const CONTENT_GLOSSARY: TriText[] = [
  {
    vi: "{code} phát hiện tiếng ồn bất thường / rung mạnh khi chạy thử.",
    en: "{code} detected unusual noise / strong vibration during test run.",
    ko: "{code} 시운전 중 이상 소음/강한 진동이 감지되었습니다.",
  },
  {
    vi: "{code} đèn báo lỗi HMI nhấp nháy đỏ — nghi ngờ cảm biến.",
    en: "{code} HMI fault light blinking red — suspected sensor issue.",
    ko: "{code} HMI 적색 고장등 점멸 — 센서 이상으로 의심됩니다.",
  },
  {
    vi: "{code} nhiệt độ vòng bi vượt ngưỡng an toàn.",
    en: "{code} bearing temperature exceeded the safe threshold.",
    ko: "{code} 베어링 온도가 안전 임계값을 초과했습니다.",
  },
  {
    vi: "{code} mất tín hiệu encoder — dừng khẩn cấp.",
    en: "{code} encoder signal lost — emergency stop.",
    ko: "{code} 엔코더 신호 소실 — 비상 정지.",
  },
  {
    vi: "{code} có tiếng kêu lạ ở vòng bi, đã dừng máy.",
    en: "{code} has unusual bearing noise; machine stopped.",
    ko: "{code} 베어링에서 이상 소음이 있어 기계를 정지했습니다.",
  },
  {
    vi: "{code} HMI báo lỗi cảm biến — đang chờ chỉ thị.",
    en: "{code} HMI reports sensor fault — awaiting instructions.",
    ko: "{code} HMI 센서 오류 보고 — 지시를 기다리는 중입니다.",
  },
  {
    vi: "Kiểm tra vòng bi số 2 và chụp thêm ảnh mặt bích.",
    en: "Check bearing #2 and take extra photos of the flange.",
    ko: "2번 베어링을 점검하고 플랜지 사진을 추가로 촬영하세요.",
  },
  {
    vi: "Reset cảm biến, nếu còn lỗi thì đổi module I/O.",
    en: "Reset the sensor; if error persists, replace the I/O module.",
    ko: "센서를 리셋하고, 오류가 계속되면 I/O 모듈을 교체하세요.",
  },
  {
    vi: "Quản lý đã xác nhận SỬA XONG. Phòng chat đã khóa.",
    en: "Manager confirmed FIXED. Chat room locked.",
    ko: "관리자가 수리 완료를 확인했습니다. 채팅방이 잠겼습니다.",
  },
  // Ban ghi cu hardcode TB2/TB4
  {
    vi: "TB2 phát hiện tiếng ồn bất thường / rung mạnh khi chạy thử.",
    en: "TB2 detected unusual noise / strong vibration during test run.",
    ko: "TB2 시운전 중 이상 소음/강한 진동이 감지되었습니다.",
  },
  {
    vi: "TB4 đèn báo lỗi HMI nhấp nháy đỏ — nghi ngờ cảm biến.",
    en: "TB4 HMI fault light blinking red — suspected sensor issue.",
    ko: "TB4 HMI 적색 고장등 점멸 — 센서 이상으로 의심됩니다.",
  },
];

function normalize(s: string) {
  return s
    .trim()
    .replace(/[\u2013\u2014\u2212]/g, "—")
    .replace(/\s+/g, " ");
}

function extractMachineCode(text: string): string | null {
  const m = text.match(/\bTB\d+\b/i);
  return m ? m[0].toUpperCase() : null;
}

function matchGlossary(raw: string): { entry: TriText; code: string | null } | null {
  const n = normalize(raw);

  for (const g of CONTENT_GLOSSARY) {
    if (normalize(g.vi) === n || normalize(g.en) === n || normalize(g.ko) === n) {
      return { entry: g, code: extractMachineCode(raw) };
    }
  }

  // Template {code}: so khop phan con lai sau ma may
  const code = extractMachineCode(raw);
  if (code) {
    const stripped = normalize(raw.replace(new RegExp(code, "i"), "{code}"));
    for (const g of CONTENT_GLOSSARY) {
      if (
        normalize(g.vi) === stripped ||
        normalize(g.en) === stripped ||
        normalize(g.ko) === stripped
      ) {
        return { entry: g, code };
      }
    }
  }

  return null;
}

function fillCode(template: string, code: string | null) {
  if (!code) return template.replace(/\{code\}\s*/g, "").trim();
  return template.replace(/\{code\}/g, code);
}

/** Dich noi dung nghiep vu (mo ta su co, ...) theo locale UI */
export function translateContent(text: string | null | undefined, locale: AppLocale): string {
  const raw = normalize(String(text || ""));
  if (!raw) return "";

  const hit = matchGlossary(raw);
  if (!hit) return raw;

  const target =
    locale === "vi" ? hit.entry.vi : locale === "en" ? hit.entry.en : hit.entry.ko;
  return fillCode(target, hit.code || extractMachineCode(raw));
}
