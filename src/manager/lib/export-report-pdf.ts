import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type {
  ApiReportMachine,
  ApiReportMachinesResponse,
  ApiReportRangeResponse,
} from "@/lib/api";
import { machineLabel, shiftLabel, translateContent, zoneLabel } from "@/i18n/contentLabels";

/** PDF labels always bilingual VI / KO */
const L = {
  title: "Báo cáo thiết bị ca / 교대 설비 보고",
  periodTitle: "Báo cáo theo kỳ / 기간 보고",
  continued: "tiếp / 계속",
  bilingual: "Song ngữ Việt – Hàn / 베트남어–한국어",
  shift: "Ca / 교대",
  period: "Kỳ / 기간",
  deadline: "Hạn nộp / 마감",
  generatedAt: "Xuất lúc / 생성 시각",
  summary: "Chi tiết thiết bị / 설비 상세",
  overview: "Tổng hợp kỳ / 기간 요약",
  byDay: "Theo ngày / 일별",
  byZone: "Theo bộ phận / 부서별",
  compliance: "Compliance / 준수율",
  legendUnchecked: "Hàng nền cam = Chưa kiểm tra / 주황색 행 = 미점검 (cần theo dõi)",
  total: "Tất cả / 전체",
  ok: "OK",
  ng: "NG",
  missing: "Quá hạn / 기한 초과",
  unchecked: "Chưa kiểm / 미점검",
  colDate: "Ngày / 날짜",
  colNo: "STT / 번호",
  colCode: "Mã / 코드",
  colName: "Thiết bị / 설비",
  colZone: "Bộ phận / 부서",
  colStatus: "Trạng thái / 상태",
  colNote: "Ghi chú / 비고",
  colBy: "Người kiểm / 점검자",
  colAt: "Thời gian / 시간",
  status: {
    unchecked: "Chưa kiểm / 미점검",
    missing: "Quá hạn / 기한 초과",
    ng: "NG",
    ok: "OK",
  },
  statusVi: {
    unchecked: "Chưa kiểm",
    missing: "Quá hạn",
    ng: "NG",
    ok: "OK",
  },
  statusKo: {
    unchecked: "미점검",
    missing: "기한 초과",
    ng: "NG",
    ok: "OK",
  },
  noteUnchecked: "Chưa được kiểm tra trong ca — cần theo dõi kịp thời.\n이번 교대 미점검 — 적시 추적 필요.",
  noteMissing: "Đã quá hạn nộp báo cáo.\n보고 마감 지남.",
  noteOk: "—",
};

const CANVAS_SCALE = 2;
const ORPHAN_CANVAS_PX = 48;
/** mm tối thiểu còn lại cho phần đầu bảng (thead + vài hàng) khi keep-together */
const MIN_TABLE_START_MM = 38;

function bi(vi: string, ko: string) {
  if (vi === ko) return vi;
  return `${vi}\n${ko}`;
}

function noteForMachine(m: ApiReportMachine): string {
  if (m.reportStatus === "unchecked") return L.noteUnchecked;
  if (m.reportStatus === "missing") return L.noteMissing;
  if (m.reportStatus === "ng") {
    const raw = (m.reason || "").trim();
    if (!raw) return bi("NG — chưa có mô tả lỗi.", "NG — 오류 설명 없음.");
    const vi = translateContent(raw, "vi");
    const ko = translateContent(raw, "ko");
    return bi(vi, ko);
  }
  return L.noteOk;
}

function rowStyle(m: ApiReportMachine) {
  if (m.reportStatus === "unchecked") return "background:#fff7ed;";
  if (m.reportStatus === "missing") return "background:#f3f4f6;";
  if (m.reportStatus === "ng") return "background:#fef2f2;";
  return "";
}

function statusColor(status: string) {
  if (status === "unchecked") return "#c2410c";
  if (status === "missing") return "#4b5563";
  if (status === "ng") return "#dc2626";
  if (status === "ok") return "#15803d";
  return "#111";
}

function offscreenRoot(): HTMLDivElement {
  const root = document.createElement("div");
  root.style.cssText =
    "position:fixed;left:-10000px;top:0;width:1200px;padding:16px 20px;background:#fff;color:#111;font-family:'Malgun Gothic','Segoe UI',Arial,sans-serif;font-size:11px;line-height:1.3;box-sizing:border-box;";
  return root;
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statBox(label: string, value: number | string, color = "#111") {
  return `<div style="border:1px solid #e5e7eb;border-radius:6px;padding:6px 10px;min-width:78px;">
    <div style="font-size:9px;color:#6b7280;white-space:pre-line;">${escapeHtml(label)}</div>
    <div style="font-size:16px;font-weight:700;color:${color};">${value}</div>
  </div>`;
}

/** Ô bảng: căn giữa dọc, không tràn sang cột khác */
const TD =
  "padding:6px 5px;border:1px solid #d1d5db;vertical-align:middle;overflow:hidden;word-wrap:break-word;word-break:break-word;overflow-wrap:anywhere;line-height:1.25;";
const TH =
  "padding:6px 5px;border:1px solid #d1d5db;text-align:left;vertical-align:middle;overflow:hidden;word-wrap:break-word;word-break:break-word;line-height:1.2;font-size:10px;";
const OV =
  "padding:6px 5px;border:1px solid #d1d5db;vertical-align:middle;line-height:1.25;";
const OVH =
  "padding:6px 5px;border:1px solid #d1d5db;vertical-align:middle;line-height:1.2;font-weight:600;";

function statusLabelHtml(status: string): string {
  const key = status as keyof typeof L.statusVi;
  if (key in L.statusVi) {
    return escapeHtml(bi(L.statusVi[key], L.statusKo[key])).replace(/\n/g, "<br/>");
  }
  return escapeHtml(status);
}

function machineRowsHtml(machines: ApiReportMachine[]): string {
  return machines
    .map((m, index) => {
      const nameVi = machineLabel(m.deviceCode, "vi", m.deviceName);
      const nameKo = machineLabel(m.deviceCode, "ko", m.deviceName);
      const zoneVi = zoneLabel(m.zoneCode || m.zoneName, "vi", m.zoneName);
      const zoneKo = zoneLabel(m.zoneCode || m.zoneName, "ko", m.zoneName);
      const at = m.checkedAt
        ? new Date(m.checkedAt).toLocaleString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
          })
        : "—";
      const noteHtml = escapeHtml(noteForMachine(m)).replace(/\n/g, "<br/>");
      const nameHtml = escapeHtml(bi(nameVi, nameKo)).replace(/\n/g, "<br/>");
      const zoneHtml = escapeHtml(bi(zoneVi, zoneKo)).replace(/\n/g, "<br/>");
      const statusHtml = statusLabelHtml(m.reportStatus);

      return `<tr style="${rowStyle(m)}">
        <td style="${TD}text-align:center;font-weight:600;color:#374151;">${index + 1}</td>
        <td style="${TD}font-family:monospace;font-size:10px;">${escapeHtml(m.deviceCode)}</td>
        <td style="${TD}">${nameHtml}</td>
        <td style="${TD}">${zoneHtml}</td>
        <td style="${TD}font-weight:700;color:${statusColor(m.reportStatus)};">${statusHtml}</td>
        <td style="${TD}font-size:10px;">${noteHtml}</td>
        <td style="${TD}font-size:10px;">${escapeHtml(m.checkedBy || "—")}</td>
        <td style="${TD}font-size:10px;">${escapeHtml(at)}</td>
      </tr>`;
    })
    .join("");
}

function tableHeadHtml(): string {
  return `<thead>
    <tr style="background:#e5e7eb;">
      <th style="${TH}width:3.5%;text-align:center;">${escapeHtml(L.colNo)}</th>
      <th style="${TH}width:5.5%;">${escapeHtml(L.colCode)}</th>
      <th style="${TH}width:12%;">${escapeHtml(bi("Thiết bị", "설비")).replace(/\n/g, "<br/>")}</th>
      <th style="${TH}width:11%;">${escapeHtml(bi("Bộ phận", "부서")).replace(/\n/g, "<br/>")}</th>
      <th style="${TH}width:10%;">${escapeHtml(bi("Trạng thái", "상태")).replace(/\n/g, "<br/>")}</th>
      <th style="${TH}width:38%;">${escapeHtml(bi("Ghi chú", "비고")).replace(/\n/g, "<br/>")}</th>
      <th style="${TH}width:11%;">${escapeHtml(bi("Người kiểm", "점검자")).replace(/\n/g, "<br/>")}</th>
      <th style="${TH}width:9%;">${escapeHtml(bi("Thời gian", "시간")).replace(/\n/g, "<br/>")}</th>
    </tr>
  </thead>`;
}

function shiftTextFor(summary: ApiReportMachinesResponse["summary"]): string {
  return bi(
    shiftLabel(summary.shiftCode || summary.shiftLabel, "vi"),
    shiftLabel(summary.shiftCode || summary.shiftLabel, "ko")
  );
}

/** Khối đầu ngày: tiêu đề + KPI + nhãn chi tiết (keep-together với đầu bảng). */
function buildDayHeadElement(report: ApiReportMachinesResponse): HTMLDivElement {
  const { summary } = report;
  const root = offscreenRoot();
  const shiftText = shiftTextFor(summary);
  root.innerHTML = `
    <div class="pdf-block" style="margin-bottom:8px;border-bottom:2px solid #1d4ed8;padding-bottom:6px;">
      <div style="font-size:16px;font-weight:700;margin-bottom:2px;">SmartFactory · ${escapeHtml(L.title)}</div>
      <div style="color:#1d4ed8;font-size:10px;font-weight:600;">${escapeHtml(L.bilingual)}</div>
      <div style="color:#374151;margin-top:4px;">${escapeHtml(L.shift)}: ${escapeHtml(shiftText)} · ${escapeHtml(summary.sessionDate)}</div>
      ${
        summary.formDeadlineTime
          ? `<div style="color:#374151;margin-top:1px;">${escapeHtml(L.deadline)}: ${escapeHtml(summary.formDeadlineTime)}</div>`
          : ""
      }
      <div style="color:#6b7280;margin-top:2px;font-size:10px;">${escapeHtml(L.generatedAt)}: ${new Date().toLocaleString("vi-VN")}</div>
      <div style="margin-top:4px;color:#c2410c;font-weight:600;font-size:10px;">${escapeHtml(L.legendUnchecked)}</div>
    </div>
    <div class="pdf-block" style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
      ${statBox(L.total, summary.total)}
      ${statBox(L.ok, summary.ok, "#15803d")}
      ${statBox(L.ng, summary.ng, "#dc2626")}
      ${statBox(L.missing, summary.missing, "#4b5563")}
      ${statBox(L.unchecked, summary.unchecked, "#c2410c")}
    </div>
    <div class="pdf-block" style="font-weight:700;margin:0;">${escapeHtml(L.summary)}</div>
  `;
  return root;
}

/** Bảng máy đầy đủ (thead + tbody). */
function buildDayTableElement(report: ApiReportMachinesResponse): HTMLDivElement {
  const root = offscreenRoot();
  root.style.paddingTop = "4px";
  root.innerHTML = `
    <table class="pdf-block pdf-machine-table" style="width:100%;border-collapse:collapse;table-layout:fixed;">
      <colgroup>
        <col style="width:3.5%" />
        <col style="width:5.5%" />
        <col style="width:12%" />
        <col style="width:11%" />
        <col style="width:10%" />
        <col style="width:38%" />
        <col style="width:11%" />
        <col style="width:9%" />
      </colgroup>
      ${tableHeadHtml()}
      <tbody>${machineRowsHtml(report.machines)}</tbody>
    </table>`;
  return root;
}

/** Header gọn cho trang tiếp theo. */
function buildContinuationHeaderElement(report: ApiReportMachinesResponse): HTMLDivElement {
  const { summary } = report;
  const root = offscreenRoot();
  root.style.paddingBottom = "8px";
  const shiftText = shiftTextFor(summary);
  root.innerHTML = `
    <div class="pdf-block" style="border-bottom:1px solid #93c5fd;padding-bottom:6px;margin-bottom:0;">
      <div style="font-size:13px;font-weight:700;">SmartFactory · ${escapeHtml(L.title)}</div>
      <div style="color:#374151;margin-top:2px;font-size:10px;">
        ${escapeHtml(L.shift)}: ${escapeHtml(shiftText)} · ${escapeHtml(summary.sessionDate)}
        <span style="color:#1d4ed8;font-weight:600;"> · ${escapeHtml(L.continued)}</span>
      </div>
    </div>`;
  return root;
}

function buildPeriodOverviewElement(
  data: ApiReportRangeResponse,
  periodLabel: string,
  shiftLabelText: string,
  rangeHint?: string
): HTMLDivElement {
  const { summary, byDay, byZone } = data;
  const root = offscreenRoot();
  const rangeText = rangeHint || `${summary.from} → ${summary.to}`;

  const dayRows = byDay
    .map(
      (d) => `<tr>
        <td style="${OV}white-space:nowrap;">${escapeHtml(d.date)}</td>
        <td style="${OV}text-align:center;color:#15803d;font-weight:600;">${d.ok}</td>
        <td style="${OV}text-align:center;color:#dc2626;font-weight:600;">${d.ng}</td>
        <td style="${OV}text-align:center;color:#4b5563;font-weight:600;">${d.missing}</td>
        <td style="${OV}text-align:center;color:#c2410c;font-weight:600;">${d.unchecked}</td>
        <td style="${OV}text-align:center;">${escapeHtml(d.shiftCode || "—")}</td>
      </tr>`
    )
    .join("");

  const zoneRows = byZone
    .map((z) => {
      const zoneVi = zoneLabel(z.zoneCode || z.zoneName, "vi", z.zoneName);
      const zoneKo = zoneLabel(z.zoneCode || z.zoneName, "ko", z.zoneName);
      return `<tr>
        <td style="${OV}">${escapeHtml(bi(zoneVi, zoneKo)).replace(/\n/g, "<br/>")}</td>
        <td style="${OV}text-align:center;color:#15803d;font-weight:600;">${z.ok}</td>
        <td style="${OV}text-align:center;color:#dc2626;font-weight:600;">${z.ng}</td>
        <td style="${OV}text-align:center;color:#4b5563;font-weight:600;">${z.missing}</td>
        <td style="${OV}text-align:center;color:#c2410c;font-weight:600;">${z.unchecked}</td>
        <td style="${OV}text-align:center;">${z.total}</td>
      </tr>`;
    })
    .join("");

  root.innerHTML = `
    <div class="pdf-block" style="margin-bottom:8px;border-bottom:2px solid #1d4ed8;padding-bottom:6px;">
      <div style="font-size:16px;font-weight:700;margin-bottom:2px;">SmartFactory · ${escapeHtml(L.periodTitle)}</div>
      <div style="color:#1d4ed8;font-size:10px;font-weight:600;">${escapeHtml(L.bilingual)}</div>
      <div style="color:#374151;margin-top:4px;">${escapeHtml(L.period)}: ${escapeHtml(periodLabel)} · ${escapeHtml(rangeText)}</div>
      <div style="color:#374151;margin-top:1px;">${escapeHtml(L.shift)}: ${escapeHtml(shiftLabelText)}</div>
      <div style="color:#6b7280;margin-top:2px;font-size:10px;">${escapeHtml(L.generatedAt)}: ${new Date().toLocaleString("vi-VN")}</div>
    </div>
    <div class="pdf-block" style="font-weight:700;margin:4px 0 8px;">${escapeHtml(L.overview)}</div>
    <div class="pdf-block" style="display:flex;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
      ${statBox(L.total, summary.total)}
      ${statBox(L.ok, summary.ok, "#15803d")}
      ${statBox(L.ng, summary.ng, "#dc2626")}
      ${statBox(L.missing, summary.missing, "#4b5563")}
      ${statBox(L.unchecked, summary.unchecked, "#c2410c")}
      ${statBox(L.compliance, `${summary.compliance}%`, "#1d4ed8")}
    </div>
    <div class="pdf-block" style="font-weight:700;margin:10px 0 8px;">${escapeHtml(L.byDay)}</div>
    <table class="pdf-block" style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:4px;">
      <colgroup>
        <col style="width:28%" />
        <col style="width:12%" />
        <col style="width:12%" />
        <col style="width:18%" />
        <col style="width:18%" />
        <col style="width:12%" />
      </colgroup>
      <thead>
        <tr style="background:#e5e7eb;">
          <th style="${OVH}text-align:left;">${escapeHtml(L.colDate)}</th>
          <th style="${OVH}text-align:center;">${escapeHtml(L.ok)}</th>
          <th style="${OVH}text-align:center;">${escapeHtml(L.ng)}</th>
          <th style="${OVH}text-align:center;">${escapeHtml(L.missing)}</th>
          <th style="${OVH}text-align:center;">${escapeHtml(L.unchecked)}</th>
          <th style="${OVH}text-align:center;">${escapeHtml(L.shift)}</th>
        </tr>
      </thead>
      <tbody>${dayRows}</tbody>
    </table>
    <div class="pdf-block" style="font-weight:700;margin:10px 0 8px;">${escapeHtml(L.byZone)}</div>
    <table class="pdf-block" style="width:100%;border-collapse:collapse;table-layout:fixed;">
      <colgroup>
        <col style="width:28%" />
        <col style="width:12%" />
        <col style="width:12%" />
        <col style="width:18%" />
        <col style="width:18%" />
        <col style="width:12%" />
      </colgroup>
      <thead>
        <tr style="background:#e5e7eb;">
          <th style="${OVH}text-align:left;">${escapeHtml(L.colZone)}</th>
          <th style="${OVH}text-align:center;">${escapeHtml(L.ok)}</th>
          <th style="${OVH}text-align:center;">${escapeHtml(L.ng)}</th>
          <th style="${OVH}text-align:center;">${escapeHtml(L.missing)}</th>
          <th style="${OVH}text-align:center;">${escapeHtml(L.unchecked)}</th>
          <th style="${OVH}text-align:center;">${escapeHtml(L.total)}</th>
        </tr>
      </thead>
      <tbody>${zoneRows}</tbody>
    </table>
  `;
  return root;
}

function collectBreakYs(root: HTMLElement, scale: number, canvasHeight: number): number[] {
  const rootRect = root.getBoundingClientRect();
  const set = new Set<number>([0, canvasHeight]);

  const pushBottom = (node: Element) => {
    const r = (node as HTMLElement).getBoundingClientRect();
    const y = Math.round((r.bottom - rootRect.top) * scale);
    if (y > 0 && y <= canvasHeight) set.add(y);
  };

  root.querySelectorAll("tr").forEach(pushBottom);
  root.querySelectorAll(".pdf-block").forEach(pushBottom);

  return [...set].sort((a, b) => a - b);
}

function theadBottomPx(root: HTMLElement, scale: number): number {
  const thead = root.querySelector("thead");
  if (!thead) return 0;
  const rootRect = root.getBoundingClientRect();
  const r = thead.getBoundingClientRect();
  return Math.round((r.bottom - rootRect.top) * scale);
}

function pickSliceEnd(breaks: number[], start: number, maxEnd: number, totalHeight: number): number {
  const hardMax = Math.min(maxEnd, totalHeight);
  if (hardMax >= totalHeight) return totalHeight;

  let best = start;
  for (const y of breaks) {
    if (y > start && y <= hardMax) best = y;
  }
  if (best <= start) return hardMax;

  const leftover = totalHeight - best;
  if (leftover > 0 && leftover < ORPHAN_CANVAS_PX) {
    const need = best + leftover - start;
    if (start + need <= maxEnd + 1) return totalHeight;
  }
  return best;
}

type PdfLayout = {
  pdf: jsPDF;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
  cursorY: number;
  hasContent: boolean;
};

function createPdfLayout(): PdfLayout {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 7;
  return {
    pdf,
    pageWidth,
    pageHeight,
    margin,
    contentWidth: pageWidth - margin * 2,
    cursorY: margin,
    hasContent: false,
  };
}

function canvasPxToMm(px: number, canvasWidth: number, contentWidthMm: number): number {
  return (px * contentWidthMm) / canvasWidth;
}

function remainingMm(layout: PdfLayout): number {
  return layout.pageHeight - layout.margin - layout.cursorY;
}

function newPage(layout: PdfLayout) {
  layout.pdf.addPage();
  layout.cursorY = layout.margin;
}

function drawCanvasSlice(
  layout: PdfLayout,
  canvas: HTMLCanvasElement,
  srcY: number,
  srcH: number,
  destYMm: number
): number {
  const slice = document.createElement("canvas");
  slice.width = canvas.width;
  slice.height = Math.max(1, Math.ceil(srcH));
  const ctx = slice.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, slice.width, slice.height);
  ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

  const hMm = canvasPxToMm(srcH, canvas.width, layout.contentWidth);
  layout.pdf.addImage(
    slice.toDataURL("image/jpeg", 0.92),
    "JPEG",
    layout.margin,
    destYMm,
    layout.contentWidth,
    hMm
  );
  return hMm;
}

async function renderCanvas(el: HTMLElement): Promise<HTMLCanvasElement> {
  document.body.appendChild(el);
  try {
    void el.offsetHeight;
    return await html2canvas(el, {
      scale: CANVAS_SCALE,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });
  } finally {
    document.body.removeChild(el);
  }
}

/** Vẽ cả khối tại cursor; sang trang nếu không đủ chỗ (kể cả keepWithNext). */
async function paintBlock(
  layout: PdfLayout,
  el: HTMLElement,
  opts: { preferContinue: boolean; keepWithNextMm?: number }
): Promise<void> {
  document.body.appendChild(el);
  void el.offsetHeight;
  const canvas = await html2canvas(el, {
    scale: CANVAS_SCALE,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });
  const breaksLive = collectBreakYs(el, CANVAS_SCALE, canvas.height);
  document.body.removeChild(el);

  const blockMm = canvasPxToMm(canvas.height, canvas.width, layout.contentWidth);
  const need = blockMm + (opts.keepWithNextMm || 0);
  const rem = remainingMm(layout);

  if (layout.hasContent) {
    if (!opts.preferContinue || rem < need) {
      newPage(layout);
    }
  } else {
    layout.cursorY = layout.margin;
  }

  let rendered = 0;
  while (rendered < canvas.height) {
    if (remainingMm(layout) < 8) newPage(layout);
    const spaceMm = remainingMm(layout);
    const maxPx = (spaceMm * canvas.width) / layout.contentWidth;
    let end = pickSliceEnd(breaksLive, rendered, rendered + maxPx, canvas.height);
    if (end <= rendered) end = Math.min(canvas.height, Math.floor(rendered + maxPx));
    const hMm = drawCanvasSlice(layout, canvas, rendered, end - rendered, layout.cursorY);
    layout.cursorY += hMm;
    layout.hasContent = true;
    rendered = end;
    if (rendered < canvas.height) newPage(layout);
  }
}

/**
 * Vẽ bảng máy: trang đầu gồm thead+rows;
 * trang sau: header slim + thead lặp + rows còn lại.
 */
async function paintMachineTable(
  layout: PdfLayout,
  tableEl: HTMLDivElement,
  continuationHeaderEl: HTMLDivElement
): Promise<void> {
  // Clone header for each continuation (html2canvas consumes layout; we re-build HTML each time via clone)
  const headerHtml = continuationHeaderEl.innerHTML;

  document.body.appendChild(tableEl);
  void tableEl.offsetHeight;
  const canvas = await html2canvas(tableEl, {
    scale: CANVAS_SCALE,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });
  const breaks = collectBreakYs(tableEl, CANVAS_SCALE, canvas.height);
  const theadEnd = Math.max(theadBottomPx(tableEl, CANVAS_SCALE), breaks.find((y) => y > 0) || 0);
  document.body.removeChild(tableEl);

  let rendered = 0;
  let pageIndex = 0;

  while (rendered < canvas.height) {
    if (pageIndex > 0) {
      newPage(layout);
      // Slim header
      const hdr = offscreenRoot();
      hdr.style.paddingBottom = "6px";
      hdr.innerHTML = headerHtml;
      const hdrCanvas = await renderCanvas(hdr);
      const hdrMm = drawCanvasSlice(layout, hdrCanvas, 0, hdrCanvas.height, layout.cursorY);
      layout.cursorY += hdrMm + 1;
      // Repeat thead
      if (theadEnd > 0) {
        const thMm = drawCanvasSlice(layout, canvas, 0, theadEnd, layout.cursorY);
        layout.cursorY += thMm;
      }
      // Body starts after thead on continuation
      if (rendered < theadEnd) rendered = theadEnd;
    } else if (remainingMm(layout) < 12) {
      newPage(layout);
    }

    const spaceMm = remainingMm(layout);
    if (spaceMm < 10) {
      pageIndex += 1;
      continue;
    }

    const maxPx = (spaceMm * canvas.width) / layout.contentWidth;
    // Trang đầu: cắt từ rendered (0); trang sau: từ rendered (>= theadEnd)
    let end = pickSliceEnd(breaks, rendered, rendered + maxPx, canvas.height);
    if (end <= rendered) end = Math.min(canvas.height, Math.floor(rendered + maxPx));

    const leftover = canvas.height - end;
    if (leftover > 0 && leftover < ORPHAN_CANVAS_PX) {
      const needMm = canvasPxToMm(end - rendered + leftover, canvas.width, layout.contentWidth);
      if (needMm <= spaceMm + 1) end = canvas.height;
    }

    // Không cắt ngay dưới thead mà không có hàng nào
    if (pageIndex === 0 && end <= theadEnd && canvas.height > theadEnd) {
      // Force at least one body row if possible
      const nextBreak = breaks.find((y) => y > theadEnd);
      if (nextBreak && nextBreak <= rendered + maxPx) end = nextBreak;
    }

    const sliceH = Math.max(1, end - rendered);
    const hMm = drawCanvasSlice(layout, canvas, rendered, sliceH, layout.cursorY);
    layout.cursorY += hMm;
    layout.hasContent = true;
    rendered = end;
    pageIndex += 1;
  }

  layout.cursorY += 2;
}

async function appendDayReport(
  layout: PdfLayout,
  report: ApiReportMachinesResponse,
  preferContinue: boolean
): Promise<void> {
  const headEl = buildDayHeadElement(report);
  const tableEl = buildDayTableElement(report);
  const contEl = buildContinuationHeaderElement(report);

  await paintBlock(layout, headEl, {
    preferContinue,
    keepWithNextMm: MIN_TABLE_START_MM,
  });
  await paintMachineTable(layout, tableEl, contEl);
}

/** Overview kỳ — một khối, cắt an toàn theo hàng. */
async function appendOverview(
  layout: PdfLayout,
  el: HTMLElement
): Promise<void> {
  await paintBlock(layout, el, { preferContinue: false });
  layout.cursorY += 2;
}

export async function exportReportToPdf(report: ApiReportMachinesResponse): Promise<string> {
  const layout = createPdfLayout();
  await appendDayReport(layout, report, false);
  const filename = `SmartFactory-Report-VI-KO-${report.summary.sessionDate}-${report.summary.shiftCode || "ALL"}.pdf`;
  layout.pdf.save(filename);
  return filename;
}

export type PeriodExportMeta = {
  periodLabel: string;
  rangeHint?: string;
  shiftLabel: string;
};

export async function exportPeriodReportToPdf(
  data: ApiReportRangeResponse,
  meta: PeriodExportMeta
): Promise<string> {
  const layout = createPdfLayout();
  const overview = buildPeriodOverviewElement(
    data,
    meta.periodLabel,
    meta.shiftLabel,
    meta.rangeHint
  );
  await appendOverview(layout, overview);

  for (const day of data.days) {
    await appendDayReport(layout, day, true);
  }

  const shiftTag = data.summary.shift || "ALL";
  const codeFile = meta.periodLabel.replace(/\//g, "_");
  const filename = `SmartFactory-Report-VI-KO-${codeFile}-${shiftTag}.pdf`;
  layout.pdf.save(filename);
  return filename;
}
