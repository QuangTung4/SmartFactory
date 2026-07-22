import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { ApiReportMachine, ApiReportMachinesResponse } from "@/lib/api";
import { machineLabel, shiftLabel, translateContent, zoneLabel } from "@/i18n/contentLabels";

/** PDF labels always bilingual VI / KO */
const L = {
  title: "Báo cáo thiết bị ca / 교대 설비 보고",
  bilingual: "Song ngữ Việt – Hàn / 베트남어–한국어",
  shift: "Ca / 교대",
  deadline: "Hạn nộp / 마감",
  generatedAt: "Xuất lúc / 생성 시각",
  summary: "Chi tiết thiết bị / 설비 상세",
  legendUnchecked: "Hàng nền cam = Chưa kiểm tra / 주황색 행 = 미점검 (cần theo dõi)",
  total: "Tất cả / 전체",
  ok: "OK",
  ng: "NG",
  missing: "Quá hạn / 기한 초과",
  unchecked: "Chưa kiểm / 미점검",
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
  noteUnchecked: "Chưa được kiểm tra trong ca — cần theo dõi kịp thời.\n이번 교대 미점검 — 적시 추적 필요.",
  noteMissing: "Đã quá hạn nộp báo cáo.\n보고 마감 지남.",
  noteOk: "—",
};

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
  if (m.reportStatus === "unchecked") return "background:#fff7ed;"; // amber highlight
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

function buildReportElement(report: ApiReportMachinesResponse): HTMLDivElement {
  const { summary, machines } = report;
  const root = document.createElement("div");
  root.style.cssText =
    "position:fixed;left:-10000px;top:0;width:1200px;padding:24px;background:#fff;color:#111;font-family:'Malgun Gothic','Segoe UI',Arial,sans-serif;font-size:11px;line-height:1.35;";

  const rows = machines
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
      const statusHtml = escapeHtml(
        L.status[m.reportStatus as keyof typeof L.status] || m.reportStatus
      );

      return `<tr style="${rowStyle(m)}">
        <td style="padding:7px 6px;border:1px solid #d1d5db;text-align:center;font-weight:600;color:#374151;width:40px;">${index + 1}</td>
        <td style="padding:7px 6px;border:1px solid #d1d5db;font-family:monospace;white-space:nowrap;">${escapeHtml(m.deviceCode)}</td>
        <td style="padding:7px 6px;border:1px solid #d1d5db;">${nameHtml}</td>
        <td style="padding:7px 6px;border:1px solid #d1d5db;">${zoneHtml}</td>
        <td style="padding:7px 6px;border:1px solid #d1d5db;font-weight:700;color:${statusColor(m.reportStatus)};white-space:nowrap;">${statusHtml}</td>
        <td style="padding:7px 6px;border:1px solid #d1d5db;max-width:320px;">${noteHtml}</td>
        <td style="padding:7px 6px;border:1px solid #d1d5db;">${escapeHtml(m.checkedBy || "—")}</td>
        <td style="padding:7px 6px;border:1px solid #d1d5db;white-space:nowrap;">${escapeHtml(at)}</td>
      </tr>`;
    })
    .join("");

  root.innerHTML = `
    <div style="margin-bottom:14px;border-bottom:2px solid #1d4ed8;padding-bottom:10px;">
      <div style="font-size:18px;font-weight:700;margin-bottom:4px;">SmartFactory · ${escapeHtml(L.title)}</div>
      <div style="color:#1d4ed8;font-size:11px;font-weight:600;">${escapeHtml(L.bilingual)}</div>
      <div style="color:#374151;margin-top:6px;">${escapeHtml(L.shift)}: ${escapeHtml(bi(shiftLabel(summary.shiftCode || summary.shiftLabel, "vi"), shiftLabel(summary.shiftCode || summary.shiftLabel, "ko")))} · ${escapeHtml(summary.sessionDate)}</div>
      ${
        summary.formDeadlineTime
          ? `<div style="color:#374151;margin-top:2px;">${escapeHtml(L.deadline)}: ${escapeHtml(summary.formDeadlineTime)}</div>`
          : ""
      }
      <div style="color:#6b7280;margin-top:4px;font-size:10px;">${escapeHtml(L.generatedAt)}: ${new Date().toLocaleString("vi-VN")}</div>
      <div style="margin-top:8px;color:#c2410c;font-weight:600;">${escapeHtml(L.legendUnchecked)}</div>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;">
      ${statBox(L.total, summary.total)}
      ${statBox(L.ok, summary.ok, "#15803d")}
      ${statBox(L.ng, summary.ng, "#dc2626")}
      ${statBox(L.missing, summary.missing, "#4b5563")}
      ${statBox(L.unchecked, summary.unchecked, "#c2410c")}
    </div>
    <div style="font-weight:700;margin-bottom:6px;">${escapeHtml(L.summary)}</div>
    <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
      <thead>
        <tr style="background:#e5e7eb;">
          <th style="padding:7px 6px;border:1px solid #d1d5db;width:40px;text-align:center;">${escapeHtml(L.colNo)}</th>
          <th style="padding:7px 6px;border:1px solid #d1d5db;text-align:left;width:70px;">${escapeHtml(L.colCode)}</th>
          <th style="padding:7px 6px;border:1px solid #d1d5db;text-align:left;width:140px;">${escapeHtml(L.colName)}</th>
          <th style="padding:7px 6px;border:1px solid #d1d5db;text-align:left;width:110px;">${escapeHtml(L.colZone)}</th>
          <th style="padding:7px 6px;border:1px solid #d1d5db;text-align:left;width:110px;">${escapeHtml(L.colStatus)}</th>
          <th style="padding:7px 6px;border:1px solid #d1d5db;text-align:left;">${escapeHtml(L.colNote)}</th>
          <th style="padding:7px 6px;border:1px solid #d1d5db;text-align:left;width:90px;">${escapeHtml(L.colBy)}</th>
          <th style="padding:7px 6px;border:1px solid #d1d5db;text-align:left;width:90px;">${escapeHtml(L.colAt)}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  return root;
}

function statBox(label: string, value: number, color = "#111") {
  return `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px 12px;min-width:88px;">
    <div style="font-size:10px;color:#6b7280;white-space:pre-line;">${escapeHtml(label)}</div>
    <div style="font-size:18px;font-weight:700;color:${color};">${value}</div>
  </div>`;
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function exportReportToPdf(report: ApiReportMachinesResponse): Promise<string> {
  const el = buildReportElement(report);
  document.body.appendChild(el);

  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const imgWidth = pageWidth - margin * 2;
    const pageCanvasHeight = (canvas.width * (pageHeight - margin * 2)) / imgWidth;
    let rendered = 0;
    let page = 0;

    while (rendered < canvas.height) {
      if (page > 0) pdf.addPage();
      const sliceHeight = Math.min(pageCanvasHeight, canvas.height - rendered);
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = sliceHeight;
      const ctx = slice.getContext("2d");
      if (!ctx) throw new Error("Canvas unsupported");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(
        canvas,
        0,
        rendered,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight
      );

      const sliceImgHeight = (sliceHeight * imgWidth) / canvas.width;
      pdf.addImage(
        slice.toDataURL("image/jpeg", 0.92),
        "JPEG",
        margin,
        margin,
        imgWidth,
        sliceImgHeight
      );
      rendered += sliceHeight;
      page += 1;
    }

    const filename = `SmartFactory-Report-VI-KO-${report.summary.sessionDate}-${report.summary.shiftCode}.pdf`;
    pdf.save(filename);
    return filename;
  } finally {
    document.body.removeChild(el);
  }
}
