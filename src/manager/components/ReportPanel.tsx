import { useState } from "react";
import { ClipboardList, Clock, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocale } from "@/i18n/LocaleContext";
import { machineLabel, translateContent, zoneLabel } from "@/i18n/contentLabels";
import type { ApiReportMachine, ApiReportMachinesResponse, ApiReportRangeResponse } from "@/lib/api";
import { exportPeriodReportToPdf, exportReportToPdf } from "../lib/export-report-pdf";

type FilterKey = "attention" | "unchecked" | "missing" | "ng" | "ok" | "all";
export type ReportPeriod = "day" | "week" | "month" | "year";

type Props = {
  report: ApiReportMachinesResponse | null;
  rangeReport: ApiReportRangeResponse | null;
  period: ReportPeriod;
  /** Mã kỳ: W30/2026, 2026, 07/2026, … */
  periodLabel: string;
  rangeHint?: string;
  shiftLabel: string;
  filter: FilterKey;
  onFilterChange: (f: FilterKey) => void;
  onSelectNg: (incidentId: string) => void;
};

const statusTone: Record<ApiReportMachine["reportStatus"], string> = {
  unchecked: "bg-warning/20 text-warning-foreground border-warning/40",
  missing: "bg-muted text-muted-foreground border-border",
  ng: "bg-destructive/15 text-destructive border-destructive/30",
  ok: "bg-success/15 text-success border-success/30",
};

function matchesFilter(m: ApiReportMachine, filter: FilterKey) {
  if (filter === "all") return true;
  if (filter === "attention") return m.reportStatus === "unchecked" || m.reportStatus === "missing";
  return m.reportStatus === filter;
}

export function ReportPanel({
  report,
  rangeReport,
  period,
  periodLabel,
  rangeHint,
  shiftLabel,
  filter,
  onFilterChange,
  onSelectNg,
}: Props) {
  const { t, locale } = useLocale();
  const [exporting, setExporting] = useState(false);
  const summary = report?.summary;
  const rangeSummary = rangeReport?.summary;
  const machines = (report?.machines ?? []).filter((m) => matchesFilter(m, filter));
  const timeLocale = locale === "ko" ? "ko-KR" : locale === "en" ? "en-US" : "vi-VN";
  const isPeriodExport = period !== "day" && !!rangeReport;

  const filterCounts = rangeSummary
    ? {
        unchecked: rangeSummary.unchecked,
        missing: rangeSummary.missing,
        ng: rangeSummary.ng,
        ok: rangeSummary.ok,
        total: rangeSummary.total,
      }
    : {
        unchecked: summary?.unchecked ?? 0,
        missing: summary?.missing ?? 0,
        ng: summary?.ng ?? 0,
        ok: summary?.ok ?? 0,
        total: summary?.total ?? 0,
      };

  const filters: { key: FilterKey; label: string; count: number }[] = [
    {
      key: "attention",
      label: t("report.filterAttention"),
      count: filterCounts.unchecked + filterCounts.missing,
    },
    { key: "unchecked", label: t("report.filterUnchecked"), count: filterCounts.unchecked },
    { key: "missing", label: t("report.filterMissing"), count: filterCounts.missing },
    { key: "ng", label: t("report.filterNg"), count: filterCounts.ng },
    { key: "ok", label: t("report.filterOk"), count: filterCounts.ok },
    { key: "all", label: t("report.filterAll"), count: filterCounts.total },
  ];

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      let filename: string;
      if (isPeriodExport && rangeReport) {
        filename = await exportPeriodReportToPdf(rangeReport, {
          periodLabel,
          rangeHint: rangeHint || `${rangeReport.summary.from} → ${rangeReport.summary.to}`,
          shiftLabel,
        });
      } else if (report) {
        filename = await exportReportToPdf(report);
      } else {
        throw new Error(t("report.pdf.fail"));
      }
      toast.success(t("report.pdf.success", { file: filename }));
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : t("report.pdf.fail"));
    } finally {
      setExporting(false);
    }
  };

  const titleDate =
    period === "day"
      ? summary?.sessionDate
      : periodLabel ||
        (rangeReport ? `${rangeReport.summary.from} → ${rangeReport.summary.to}` : summary?.sessionDate);

  const canExport = isPeriodExport ? !!rangeReport : !!report;

  return (
    <section className="flex flex-col min-h-0 h-full">
      <div className="flex-shrink-0 px-4 py-2.5 border-b border-border space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-foreground flex items-center gap-2 min-w-0 text-sm md:text-base">
            <ClipboardList className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="truncate">
              {t("report.title")}
              {titleDate ? ` · ${titleDate}` : ""}
            </span>
          </h2>
          <div className="flex items-center gap-2 flex-shrink-0">
            {summary?.formDeadlineTime && period === "day" && (
              <span className="text-[11px] text-muted-foreground whitespace-nowrap flex items-center gap-1 hidden sm:flex">
                <Clock className="h-3.5 w-3.5" />
                {t("report.deadline", { time: summary.formDeadlineTime })}
              </span>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              disabled={!canExport || exporting}
              onClick={() => void handleExportPdf()}
            >
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5 mr-1.5" />
              )}
              {exporting
                ? t("report.pdf.exporting")
                : isPeriodExport
                  ? t("report.pdf.exportPeriod")
                  : t("report.pdf.export")}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onFilterChange(f.key)}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-colors ${
                filter === f.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              {f.label} · {f.count}
            </button>
          ))}
        </div>
        {period !== "day" && rangeReport && (
          <p className="text-[11px] text-muted-foreground">
            {periodLabel}
            {rangeHint ? ` · ${rangeHint}` : ""} · {shiftLabel} · {rangeReport.summary.dayCount}{" "}
            {t("dashboard.periodDay").toLowerCase()} · PDF = {t("report.pdf.exportPeriod")}
          </p>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1.5">
          {period !== "day" && rangeReport ? (
            rangeReport.byDay.length === 0 ? (
              <div className="text-sm text-muted-foreground p-6 text-center">
                {t("report.empty")}
              </div>
            ) : (
              rangeReport.byDay.map((d) => (
                <div
                  key={d.date}
                  className="w-full rounded-lg border border-border bg-card p-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-foreground">{d.date}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {d.shiftCode || "—"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] mt-1.5">
                    <span className="text-success font-semibold">OK {d.ok}</span>
                    <span className="text-destructive font-semibold">NG {d.ng}</span>
                    <span className="text-muted-foreground">MISSING {d.missing}</span>
                    <span className="text-warning-foreground">· {d.unchecked}</span>
                  </div>
                </div>
              ))
            )
          ) : (
            <>
              {machines.length === 0 && (
                <div className="text-sm text-muted-foreground p-6 text-center">
                  {t("report.empty")}
                </div>
              )}
              {machines.map((m) => {
                const name = machineLabel(m.deviceCode, locale, m.deviceName);
                const zone = zoneLabel(m.zoneCode || m.zoneName, locale, m.zoneName);
                const clickable = m.reportStatus === "ng" && m.incidentId;
                return (
                  <button
                    key={`${m.machineId}-${m.checkId || "x"}`}
                    type="button"
                    disabled={!clickable}
                    onClick={() => {
                      if (m.incidentId) onSelectNg(m.incidentId);
                    }}
                    className={`w-full text-left rounded-lg border p-2.5 transition-all ${
                      clickable
                        ? "border-border bg-card hover:border-primary/40 cursor-pointer"
                        : "border-border bg-card cursor-default"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex items-baseline gap-2">
                        <span className="text-[11px] font-mono text-muted-foreground flex-shrink-0">
                          {m.deviceCode}
                        </span>
                        <span className="font-semibold text-sm text-foreground truncate">
                          {name}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${statusTone[m.reportStatus]}`}
                      >
                        {t(`report.status.${m.reportStatus}`)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap mt-1">
                      <span>{zone}</span>
                      {m.reportStatus === "unchecked" && (
                        <span>· {t("report.noCheckYet")}</span>
                      )}
                      {m.reportStatus === "missing" && (
                        <span>· {t("report.overdue")}</span>
                      )}
                      {m.checkedBy && <span>· {m.checkedBy}</span>}
                      {m.checkedAt && (
                        <span>
                          ·{" "}
                          {new Date(m.checkedAt).toLocaleTimeString(timeLocale, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    {m.reportStatus === "ng" && m.reason && (
                      <p className="text-[12px] text-muted-foreground line-clamp-2 mt-1">
                        {translateContent(m.reason, locale)}
                      </p>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>
      </ScrollArea>
    </section>
  );
}
