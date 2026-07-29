import { useCallback, useEffect, useMemo, useState } from "react";
import { format, startOfDay } from "date-fns";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, type ApiReportMachine } from "@/lib/api";
import { getSession } from "@/lib/auth-store";
import { useLocale } from "@/i18n/LocaleContext";
import { machineLabel, zoneLabel } from "@/i18n/contentLabels";
import { cn } from "@/lib/utils";
import { DatePickerAside } from "../components/DatePickerAside";

type ColKey = "unchecked" | "missing" | "ng" | "ok";

const COLS: { key: ColKey; labelKey: string; tone: string }[] = [
  { key: "unchecked", labelKey: "kanban.unchecked", tone: "border-border bg-muted/40" },
  { key: "missing", labelKey: "kanban.missing", tone: "border-border bg-card" },
  { key: "ng", labelKey: "kanban.ng", tone: "border-destructive/30 bg-destructive-soft/50" },
  { key: "ok", labelKey: "kanban.ok", tone: "border-success/30 bg-success-soft/50" },
];

function bucketOf(m: ApiReportMachine): ColKey {
  const s = String(m.reportStatus || "").toLowerCase();
  if (s === "ok") return "ok";
  if (s === "ng") return "ng";
  if (s === "missing") return "missing";
  return "unchecked";
}

export default function KanbanPage() {
  const { t, locale } = useLocale();
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [machines, setMachines] = useState<ApiReportMachine[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const userId = getSession()?.userId;
    if (!userId) {
      setMachines([]);
      setLoading(false);
      return;
    }
    try {
      const data = await api.managerReportMachines(format(anchor, "yyyy-MM-dd"), undefined, userId);
      setMachines(data.machines || []);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : t("toast.loadFail"));
      setMachines([]);
    } finally {
      setLoading(false);
    }
  }, [anchor, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const byCol = useMemo(() => {
    const map: Record<ColKey, ApiReportMachine[]> = {
      unchecked: [],
      missing: [],
      ng: [],
      ok: [],
    };
    for (const m of machines) map[bucketOf(m)].push(m);
    return map;
  }, [machines]);

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
      <div className="flex-1 min-h-0 min-w-0 flex flex-col">
        <div className="flex-shrink-0 px-4 md:px-6 pt-4 md:pt-6 pb-2 space-y-1">
          <h1 className="text-headline-md text-foreground">{t("kanban.title")}</h1>
          <p className="text-xs text-muted-foreground">{t("kanban.hint")}</p>
        </div>
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            {t("ui.loading")}
          </div>
        ) : (
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 md:px-6 md:pb-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 min-w-0">
              {COLS.map((col) => {
                const rows = byCol[col.key];
                return (
                  <div
                    key={col.key}
                    className={cn(
                      "rounded-xl border shadow-card flex flex-col min-h-[280px]",
                      col.tone
                    )}
                  >
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60">
                      <span className="text-sm font-bold">{t(col.labelKey)}</span>
                      <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                        {rows.length}
                      </span>
                    </div>
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[60vh]">
                      {rows.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground text-center py-8">
                          {t("kanban.empty")}
                        </p>
                      ) : (
                        rows.map((m) => {
                          const hasIncident = Boolean(m.incidentId);
                          const inner = (
                            <div className="rounded-lg border border-border bg-card p-2.5 shadow-sm hover:border-primary/40 transition-colors">
                              <div className="text-sm font-semibold truncate">
                                {m.deviceCode}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {machineLabel(m.deviceCode, locale, m.deviceName)}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-1 truncate">
                                {zoneLabel(m.zoneCode, locale, m.zoneName)}
                                {m.checkedBy ? ` · ${m.checkedBy}` : ""}
                              </div>
                              {hasIncident && (
                                <div className="text-[10px] font-semibold text-primary mt-1">
                                  {t("kanban.openIncident")}
                                </div>
                              )}
                            </div>
                          );
                          return hasIncident ? (
                            <Link
                              key={m.machineId}
                              to={`/manager/incidents?incident=${encodeURIComponent(String(m.incidentId))}`}
                              className="block"
                            >
                              {inner}
                            </Link>
                          ) : (
                            <div key={m.machineId}>{inner}</div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
      <DatePickerAside
        title={t("dashboard.pickDate")}
        hint={t("dashboard.pickDateHint")}
        selected={anchor}
        onSelect={setAnchor}
      />
    </div>
  );
}
