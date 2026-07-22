import { useCallback, useEffect, useMemo, useState } from "react";
import { format, startOfDay } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api, type ApiReportMachinesResponse } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleContext";
import { shiftLabel as localizeShift } from "@/i18n/contentLabels";
import type { DayKpis } from "@/lib/manager-store";
import { emptyKpis, mapKpis } from "../lib/mappers";
import { DatePickerAside } from "../components/DatePickerAside";
import { KpiStrip } from "../components/KpiStrip";
import { ReportPanel } from "../components/ReportPanel";

export default function ReportsPage() {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [kpis, setKpis] = useState<DayKpis>(emptyKpis);
  const [report, setReport] = useState<ApiReportMachinesResponse | null>(null);
  const [reportFilter, setReportFilter] = useState<
    "attention" | "unchecked" | "missing" | "ng" | "ok" | "all"
  >("all");
  const [loading, setLoading] = useState(true);
  const [apiOk, setApiOk] = useState(true);

  const dateStr = useMemo(() => format(anchor, "yyyy-MM-dd"), [anchor]);
  const isToday = dateStr === format(startOfDay(new Date()), "yyyy-MM-dd");

  const loadCore = useCallback(async () => {
    try {
      const reportData = await api.managerReportMachines(dateStr);
      setReport(reportData);

      if (isToday) {
        const k = await api.managerKpis();
        setKpis(mapKpis(k, locale));
      } else {
        const s = reportData.summary;
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
      }
      setApiOk(true);
    } catch (err) {
      setApiOk(false);
      console.error(err);
      toast.error(err instanceof Error ? err.message : t("toast.loadFail"));
    } finally {
      setLoading(false);
    }
  }, [t, locale, dateStr, isToday]);

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
          <KpiStrip kpis={kpis} compact />
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
            <div className="flex-1 min-h-0 min-w-0">
              <ReportPanel
                report={report}
                filter={reportFilter}
                onFilterChange={setReportFilter}
                onSelectNg={onSelectNg}
              />
            </div>
            <DatePickerAside
              title={t("report.pickDate")}
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
