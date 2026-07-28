import { useCallback, useEffect, useMemo, useState } from "react";
import { format, startOfDay } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth-store";
import { useLocale } from "@/i18n/LocaleContext";
import type { TaskIncidentView } from "@/lib/manager-store";
import { mapIncident } from "../lib/mappers";
import { SF_INCIDENTS_REFRESH } from "../ManagerLayout";
import { DatePickerAside } from "../components/DatePickerAside";
import { IncidentsPanel } from "../components/IncidentsPanel";
import { ZoneFilterBar, type ZoneOption } from "../components/ZoneFilterBar";

export default function IncidentsPage() {
  const { t } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [incidents, setIncidents] = useState<TaskIncidentView[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoneFilter, setZoneFilter] = useState<string | "ALL">("ALL");
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiOk, setApiOk] = useState(true);

  const dateStr = useMemo(() => format(anchor, "yyyy-MM-dd"), [anchor]);
  const isToday = dateStr === format(startOfDay(new Date()), "yyyy-MM-dd");

  const zoneOptions = useMemo(() => {
    if (zones.length) return zones;
    const map = new Map<string, ZoneOption>();
    for (const i of incidents) {
      const code = (i.zoneCode || "").trim();
      if (!code || map.has(code)) continue;
      map.set(code, { code, name: i.zoneName });
    }
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [zones, incidents]);

  const visibleIncidents = useMemo(() => {
    if (zoneFilter === "ALL") return incidents;
    return incidents.filter(
      (i) => (i.zoneCode || "").toUpperCase() === zoneFilter.toUpperCase()
    );
  }, [incidents, zoneFilter]);

  const selected = useMemo(
    () =>
      visibleIncidents.find((i) => i.incidentId === selectedId) ??
      visibleIncidents[0] ??
      null,
    [visibleIncidents, selectedId]
  );

  useEffect(() => {
    void (async () => {
      try {
        const rows = await api.zones(getSession()?.userId);
        setZones(rows.map((z) => ({ code: z.code, name: z.name })));
      } catch {
        /* optional */
      }
    })();
  }, []);

  const loadCore = useCallback(async () => {
    try {
      const list = await api.managerIncidents(dateStr, getSession()?.userId);
      const mapped = list.map(mapIncident);
      setIncidents(mapped);
      setApiOk(true);
      setSelectedId((prev) => {
        const fromQuery = searchParams.get("incident");
        if (fromQuery && mapped.some((i) => i.incidentId === fromQuery)) return fromQuery;
        if (prev && mapped.some((i) => i.incidentId === prev)) return prev;
        return mapped[0]?.incidentId ?? null;
      });
    } catch (err) {
      setApiOk(false);
      console.error(err);
      toast.error(err instanceof Error ? err.message : t("toast.loadFail"));
    } finally {
      setLoading(false);
    }
  }, [t, searchParams, dateStr]);

  useEffect(() => {
    setLoading(true);
    void loadCore();
  }, [loadCore]);

  useEffect(() => {
    if (!isToday) return;
    const id = window.setInterval(() => void loadCore(), 5000);
    return () => window.clearInterval(id);
  }, [loadCore, isToday]);

  useEffect(() => {
    const fromQuery = searchParams.get("incident");
    if (fromQuery) setSelectedId(fromQuery);
  }, [searchParams]);

  useEffect(() => {
    const onRefresh = () => void loadCore();
    window.addEventListener(SF_INCIDENTS_REFRESH, onRefresh);
    return () => window.removeEventListener(SF_INCIDENTS_REFRESH, onRefresh);
  }, [loadCore]);

  const onSelectIncident = (incidentId: string) => {
    setSelectedId(incidentId);
    setSearchParams({ incident: incidentId }, { replace: true });
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
        <div className="flex-1 min-h-0 flex flex-col">
          {zoneOptions.length > 0 && (
            <div className="flex-shrink-0 px-4 py-2 border-b border-border bg-card/40">
              <ZoneFilterBar
                zones={zoneOptions}
                value={zoneFilter}
                onChange={(code) => {
                  setZoneFilter(code);
                  setSelectedId(null);
                }}
              />
            </div>
          )}
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
            <div className="flex-1 min-h-0 min-w-0">
              <IncidentsPanel
                incidents={visibleIncidents}
                selectedId={selected?.incidentId ?? null}
                onSelect={onSelectIncident}
                sessionDate={dateStr}
              />
            </div>
            <DatePickerAside
              title={t("incidents.pickDate")}
              selected={anchor}
              onSelect={setAnchor}
              showTodayLink
              onToday={() => setAnchor(startOfDay(new Date()))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
