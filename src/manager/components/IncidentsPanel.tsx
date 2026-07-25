import { AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocale } from "@/i18n/LocaleContext";
import { machineLabel, shiftLabel, translateContent, zoneLabel } from "@/i18n/contentLabels";
import type { TaskIncidentView } from "@/lib/manager-store";

const statusClass: Record<TaskIncidentView["incidentStatus"], string> = {
  pending: "bg-warning/20 text-warning-foreground border-warning/40",
  processing: "bg-primary/15 text-primary border-primary/30",
  resolved: "bg-success/15 text-success border-success/30",
};

type Props = {
  incidents: TaskIncidentView[];
  selectedId: string | null;
  onSelect: (incidentId: string) => void;
  sessionDate?: string;
};

export function IncidentsPanel({ incidents, selectedId, onSelect, sessionDate }: Props) {
  const { t, locale } = useLocale();
  const selected = incidents.find((i) => i.incidentId === selectedId) ?? incidents[0] ?? null;
  const openCount = incidents.filter((i) => i.incidentStatus !== "resolved").length;
  const timeLocale = locale === "ko" ? "ko-KR" : locale === "en" ? "en-US" : "vi-VN";

  return (
    <section className="flex flex-col min-h-0 h-full">
      <div className="flex-shrink-0 px-4 py-2.5 border-b border-border flex items-center justify-between gap-2">
        <h2 className="font-semibold text-sm md:text-base text-foreground flex items-center gap-2 min-w-0">
          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
          <span className="truncate">
            {t("incidents.title")}
            {sessionDate ? ` · ${sessionDate}` : ""}
          </span>
        </h2>
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
          {t("incidents.open", { n: openCount })}
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1.5">
          {incidents.length === 0 && (
            <div className="text-sm text-muted-foreground p-6 text-center">
              {t("incidents.emptyDate")}
            </div>
          )}
          {incidents.map((inc) => {
            const active = selected?.incidentId === inc.incidentId;
            const name = machineLabel(inc.deviceCode, locale, inc.deviceName);
            const zone = zoneLabel(inc.zoneCode || inc.zoneName, locale, inc.zoneName);
            const reason = translateContent(inc.reason, locale);
            return (
              <button
                key={inc.incidentId}
                type="button"
                onClick={() => onSelect(inc.incidentId)}
                className={`w-full text-left rounded-md border p-2.5 transition-colors shadow-card ${
                  active
                    ? "border-primary bg-accent"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex items-baseline gap-2">
                    <span className="text-[11px] font-mono text-muted-foreground flex-shrink-0">
                      {inc.deviceCode}
                    </span>
                    <span className="font-semibold text-sm text-foreground truncate">
                      {name}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border flex-shrink-0 ${statusClass[inc.incidentStatus]}`}
                  >
                    {t(`status.${inc.incidentStatus}`)}
                  </span>
                </div>
                <p className="text-[12px] text-muted-foreground line-clamp-2 mt-1">{reason}</p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap mt-1">
                  <span>{zone}</span>
                  <span>· {shiftLabel(inc.shift, locale)}</span>
                  {inc.checkedBy && <span>· {inc.checkedBy}</span>}
                  <span>
                    ·{" "}
                    {new Date(inc.checkedAt).toLocaleTimeString(timeLocale, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {inc.imageUrls.length > 0 && (
                  <div className="mt-2 flex gap-1.5 overflow-x-auto">
                    {inc.imageUrls.slice(0, 3).map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt=""
                        className="h-12 w-12 rounded-md object-cover border border-border"
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </section>
  );
}
