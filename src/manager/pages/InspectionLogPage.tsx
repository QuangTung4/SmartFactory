import { useCallback, useEffect, useMemo, useState } from "react";
import { format, startOfDay } from "date-fns";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, type ApiInspectionLogRow } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleContext";
import { machineLabel, shiftLabel, translateContent, zoneLabel } from "@/i18n/contentLabels";
import { DatePickerAside } from "../components/DatePickerAside";

const statusClass: Record<string, string> = {
  OK: "bg-success/15 text-success border-success/30",
  NG: "bg-destructive/15 text-destructive border-destructive/30",
  MISSING: "bg-muted text-muted-foreground border-border",
};

export default function InspectionLogPage() {
  const { t, locale } = useLocale();
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [rows, setRows] = useState<ApiInspectionLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiOk, setApiOk] = useState(true);

  const dateStr = useMemo(() => format(anchor, "yyyy-MM-dd"), [anchor]);

  const load = useCallback(async () => {
    try {
      const data = await api.managerInspectionLog(dateStr, dateStr);
      setRows(data);
      setApiOk(true);
    } catch (err) {
      setApiOk(false);
      console.error(err);
      toast.error(err instanceof Error ? err.message : t("toast.loadFail"));
    } finally {
      setLoading(false);
    }
  }, [dateStr, t]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const timeLocale = locale === "ko" ? "ko-KR" : locale === "en" ? "en-US" : "vi-VN";

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
      {!apiOk && (
        <div className="flex-shrink-0 w-full bg-destructive/10 text-destructive text-sm px-4 py-2 text-center border-b border-destructive/20">
          {t("ui.apiDown")}
        </div>
      )}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col">
        <div className="flex-shrink-0 px-4 py-2.5 border-b border-border flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-semibold text-sm md:text-base text-foreground truncate">
              {t("log.title")} · {dateStr}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t("log.count", { n: rows.length })}
            </p>
          </div>
        </div>
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            {t("ui.loading")}
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1.5">
              {rows.length === 0 && (
                <div className="text-sm text-muted-foreground p-6 text-center">
                  {t("log.empty")}
                </div>
              )}
              {rows.map((row) => (
                <div
                  key={row.checkId}
                  className="rounded-md border border-border bg-card p-2.5 shadow-card"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex items-baseline gap-2">
                      <span className="text-[11px] font-mono text-muted-foreground flex-shrink-0">
                        {row.deviceCode}
                      </span>
                      <span className="font-semibold text-sm text-foreground truncate">
                        {machineLabel(row.deviceCode, locale, row.deviceName)}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${
                        statusClass[row.checkStatus] || statusClass.MISSING
                      }`}
                    >
                      {row.checkStatus}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground mt-1">
                    <span>
                      {zoneLabel(row.zoneCode || row.zoneName, locale, row.zoneName)}
                    </span>
                    <span>· {shiftLabel(row.shiftCode || row.shiftLabel, locale)}</span>
                    {row.checkedBy && <span>· {row.checkedBy}</span>}
                    {row.checkedAt && (
                      <span>
                        ·{" "}
                        {new Date(row.checkedAt).toLocaleTimeString(timeLocale, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  {row.checkStatus === "NG" && row.reason && (
                    <p className="text-[12px] text-muted-foreground line-clamp-2 mt-1">
                      {translateContent(row.reason, locale)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
      <DatePickerAside
        title={t("log.pickDate")}
        selected={anchor}
        onSelect={setAnchor}
        showTodayLink
        onToday={() => setAnchor(startOfDay(new Date()))}
      />
    </div>
  );
}
