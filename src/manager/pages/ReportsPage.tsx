import { useCallback, useEffect, useMemo, useState } from "react";
import { format, startOfDay } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api, type ApiReportMachinesResponse, type ApiReportRangeResponse } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleContext";
import { shiftLabel as localizeShift } from "@/i18n/contentLabels";
import type { DayKpis } from "@/lib/manager-store";
import { emptyKpis, mapKpis } from "../lib/mappers";
import {
  formatPeriodCode,
  periodRangeHint,
  rangeForPeriod,
} from "../lib/report-period";
import { DatePickerAside } from "../components/DatePickerAside";
import { KpiStrip } from "../components/KpiStrip";
import { ReportPanel, type ReportPeriod } from "../components/ReportPanel";

export type ReportShiftFilter = "ALL" | "DAY" | "NIGHT";

export default function ReportsPage() {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<ReportPeriod>("day");
  const [shiftFilter, setShiftFilter] = useState<ReportShiftFilter>("ALL");
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [kpis, setKpis] = useState<DayKpis>(emptyKpis);
  const [report, setReport] = useState<ApiReportMachinesResponse | null>(null);
  const [rangeReport, setRangeReport] = useState<ApiReportRangeResponse | null>(null);
  const [reportFilter, setReportFilter] = useState<
    "attention" | "unchecked" | "missing" | "ng" | "ok" | "all"
  >("all");
  const [loading, setLoading] = useState(true);
  const [apiOk, setApiOk] = useState(true);

  const range = useMemo(() => rangeForPeriod(period, anchor), [period, anchor]);
  const fromStr = useMemo(() => format(range.from, "yyyy-MM-dd"), [range.from]);
  const toStr = useMemo(() => format(range.to, "yyyy-MM-dd"), [range.to]);
  const dateStr = fromStr;
  const isToday =
    period === "day" && dateStr === format(startOfDay(new Date()), "yyyy-MM-dd");
  const apiShift = shiftFilter === "ALL" ? undefined : shiftFilter;

  const periodCode = useMemo(() => formatPeriodCode(period, anchor), [period, anchor]);
  const rangeHint = useMemo(() => periodRangeHint(fromStr, toStr), [fromStr, toStr]);

  const shiftLabelText = useMemo(() => {
    if (shiftFilter === "ALL") return t("report.shiftAll");
    if (shiftFilter === "DAY") return t("report.shiftDay");
    return t("report.shiftNight");
  }, [shiftFilter, t]);

  const applyDaySummaryToKpis = useCallback(
    (s: ApiReportMachinesResponse["summary"]) => {
      const checked = s.ok + s.ng;
      const compliance =
        s.total === 0 ? 0 : Math.round((checked / s.total) * 1000) / 10;
      setKpis({
        sessionDate: s.sessionDate,
        shift: s.shiftCode?.toUpperCase() === "NIGHT" ? "night" : "day",
        shiftLabel: localizeShift(s.shiftCode || s.shiftLabel, locale),
        total: s.total,
        ok: s.ok,
        ng: s.ng,
        missing: s.missing,
        pending: s.unchecked,
        compliance,
      });
    },
    [locale]
  );

  const loadCore = useCallback(async () => {
    try {
      if (period === "day") {
        const reportData = await api.managerReportMachines(dateStr, apiShift);
        setReport(reportData);
        setRangeReport(null);

        if (isToday && !apiShift) {
          const k = await api.managerKpis();
          setKpis(mapKpis(k, locale));
        } else {
          applyDaySummaryToKpis(reportData.summary);
        }
      } else {
        const rangeData = await api.managerReportRange(fromStr, toStr, apiShift);
        setRangeReport(rangeData);
        const preview =
          [...rangeData.days]
            .reverse()
            .find((d) => d.summary.ok + d.summary.ng + d.summary.missing > 0) ||
          rangeData.days[rangeData.days.length - 1] ||
          null;
        setReport(preview);

        const s = rangeData.summary;
        setKpis({
          sessionDate: periodCode,
          shift: s.shiftCode?.toUpperCase() === "NIGHT" ? "night" : "day",
          shiftLabel: shiftLabelText,
          total: s.total,
          ok: s.ok,
          ng: s.ng,
          missing: s.missing,
          pending: s.unchecked,
          compliance: s.compliance,
        });
      }
      setApiOk(true);
    } catch (err) {
      setApiOk(false);
      console.error(err);
      toast.error(err instanceof Error ? err.message : t("toast.loadFail"));
    } finally {
      setLoading(false);
    }
  }, [
    t,
    locale,
    dateStr,
    fromStr,
    toStr,
    isToday,
    period,
    apiShift,
    applyDaySummaryToKpis,
    shiftLabelText,
    periodCode,
  ]);

  useEffect(() => {
    setLoading(true);
    void loadCore();
  }, [loadCore]);

  useEffect(() => {
    if (!isToday) return;
    const id = window.setInterval(() => void loadCore(), 5000);
    return () => window.clearInterval(id);
  }, [loadCore, isToday]);

  const onSelectNg = (incidentId: string) => {
    navigate(`/manager/incidents?incident=${incidentId}`);
  };

  const periods: { key: ReportPeriod; label: string }[] = [
    { key: "day", label: t("dashboard.periodDay") },
    { key: "week", label: t("dashboard.periodWeek") },
    { key: "month", label: t("dashboard.periodMonth") },
    { key: "year", label: t("dashboard.periodYear") },
  ];

  const shifts: { key: ReportShiftFilter; label: string }[] = [
    { key: "ALL", label: t("report.shiftAll") },
    { key: "DAY", label: t("report.shiftDay") },
    { key: "NIGHT", label: t("report.shiftNight") },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {!apiOk && (
        <div className="flex-shrink-0 bg-destructive/10 text-destructive text-sm px-4 py-2 text-center border-b border-destructive/20">
          {t("ui.apiDown")}
        </div>
      )}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          {t("ui.loading")}
        </div>
      ) : (
        <>
          <div className="flex-shrink-0 px-4 py-2 border-b border-border bg-card/40 flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[11px] font-semibold text-muted-foreground mr-1">
                {t("report.period")}
              </span>
              {periods.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPeriod(p.key)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border transition-colors ${
                    period === p.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[11px] font-semibold text-muted-foreground mr-1">
                {t("report.shiftFilter")}
              </span>
              {shifts.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setShiftFilter(s.key)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border transition-colors ${
                    shiftFilter === s.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-muted-foreground ml-auto text-right">
              <div className="font-semibold text-foreground">
                {periodCode} · {shiftLabelText}
              </div>
              {period !== "day" && (
                <div className="text-[10px] mt-0.5">{rangeHint}</div>
              )}
            </div>
          </div>
          <KpiStrip kpis={kpis} compact />
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
            <div className="flex-1 min-h-0 min-w-0">
              <ReportPanel
                report={report}
                rangeReport={rangeReport}
                period={period}
                periodLabel={periodCode}
                rangeHint={rangeHint}
                shiftLabel={shiftLabelText}
                filter={reportFilter}
                onFilterChange={setReportFilter}
                onSelectNg={onSelectNg}
              />
            </div>
            <DatePickerAside
              title={t("report.pickDate")}
              hint={t("report.pickDateHint")}
              selected={anchor}
              onSelect={setAnchor}
              showTodayLink
              onToday={() => setAnchor(startOfDay(new Date()))}
            />
          </div>
        </>
      )}
    </div>
  );
}
