import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, addMonths, format, startOfDay, startOfMonth } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, type ApiDashboardStats } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleContext";
import { zoneLabel } from "@/i18n/contentLabels";
import { DatePickerAside } from "../components/DatePickerAside";
import {
  formatPeriodCode,
  periodRangeHint,
  rangeForPeriod,
  type ReportPeriodKind,
} from "../lib/report-period";

type Period = ReportPeriodKind;

/** Chart series — DESIGN.md chart-ok / chart-ng / chart-missing */
const STATUS_COLORS = {
  ok: "hsl(var(--chart-ok))",
  ng: "hsl(var(--chart-ng))",
  missing: "hsl(var(--chart-missing))",
};

function rangeWithGrain(period: Period, anchor: Date) {
  const range = rangeForPeriod(period, anchor);
  return {
    ...range,
    grain: (period === "year" ? "month" : "day") as "day" | "month",
  };
}

function normalizeBucketKey(bucket: string | Date) {
  if (bucket instanceof Date) return format(bucket, "yyyy-MM-dd");
  const s = String(bucket || "");
  // "2026-07-22" or "2026-07-22T00:00:00.000Z" or "2026-07"
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  return s.slice(0, 10);
}

function padSeries(
  from: Date,
  to: Date,
  grain: "day" | "week" | "month",
  series: ApiDashboardStats["series"]
) {
  const map = new Map(
    series.map((s) => [
      normalizeBucketKey(s.bucket),
      {
        bucket: normalizeBucketKey(s.bucket),
        ok: Number(s.ok) || 0,
        ng: Number(s.ng) || 0,
        missing: Number(s.missing) || 0,
      },
    ])
  );
  const out: ApiDashboardStats["series"] = [];

  if (grain === "month") {
    let cursor = startOfMonth(from);
    const end = startOfMonth(to);
    while (cursor <= end) {
      const key = format(cursor, "yyyy-MM");
      out.push(map.get(key) ?? { bucket: key, ok: 0, ng: 0, missing: 0 });
      cursor = addMonths(cursor, 1);
    }
    return out;
  }

  let cursor = startOfDay(from);
  const end = startOfDay(to);
  while (cursor <= end) {
    const key = format(cursor, "yyyy-MM-dd");
    const row = map.get(key) ?? { bucket: key, ok: 0, ng: 0, missing: 0 };
    out.push({
      ...row,
      bucket: format(cursor, "MM-dd"),
    });
    cursor = addDays(cursor, 1);
  }
  return out;
}

export default function DashboardPage() {
  const { t, locale } = useLocale();
  const [period, setPeriod] = useState<Period>("week");
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [stats, setStats] = useState<ApiDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiOk, setApiOk] = useState(true);

  const range = useMemo(() => rangeWithGrain(period, anchor), [period, anchor]);
  const periodCode = useMemo(() => formatPeriodCode(period, anchor), [period, anchor]);
  const rangeHint = useMemo(
    () => periodRangeHint(range.from, range.to),
    [range.from, range.to]
  );

  const load = useCallback(async () => {
    try {
      const data = await api.managerDashboardStats(
        format(range.from, "yyyy-MM-dd"),
        format(range.to, "yyyy-MM-dd"),
        range.grain
      );
      setStats(data);
      setApiOk(true);
    } catch (err) {
      setApiOk(false);
      console.error(err);
      toast.error(err instanceof Error ? err.message : t("toast.loadFail"));
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, range.grain, t]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const seriesConfig: ChartConfig = {
    ok: { label: "OK", color: STATUS_COLORS.ok },
    ng: { label: "NG", color: STATUS_COLORS.ng },
    missing: { label: "MISSING", color: STATUS_COLORS.missing },
  };

  const trendData = useMemo(() => {
    if (!stats) return [];
    return padSeries(range.from, range.to, range.grain, stats.series);
  }, [stats, range.from, range.to, range.grain]);

  const pieData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "OK", key: "ok", value: stats.totals.ok, fill: STATUS_COLORS.ok },
      { name: "NG", key: "ng", value: stats.totals.ng, fill: STATUS_COLORS.ng },
      {
        name: "MISSING",
        key: "missing",
        value: stats.totals.missing,
        fill: STATUS_COLORS.missing,
      },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const incidentData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: t("status.pending"), value: stats.incidentsByStatus.pending },
      { name: t("status.processing"), value: stats.incidentsByStatus.processing },
      { name: t("status.resolved"), value: stats.incidentsByStatus.resolved },
    ];
  }, [stats, t]);

  const byZoneData = useMemo(() => {
    if (!stats) return [];
    return stats.byZone.map((z) => ({
      ...z,
      zoneLabel: zoneLabel(z.zoneCode, locale, z.zoneName),
    }));
  }, [stats, locale]);

  const periods: { key: Period; label: string }[] = [
    { key: "day", label: t("dashboard.periodDay") },
    { key: "week", label: t("dashboard.periodWeek") },
    { key: "month", label: t("dashboard.periodMonth") },
    { key: "year", label: t("dashboard.periodYear") },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
      {!apiOk && (
        <div className="flex-shrink-0 w-full bg-destructive/10 text-destructive text-sm px-4 py-2 text-center border-b border-destructive/20 lg:absolute lg:top-0 lg:inset-x-0 lg:z-10">
          {t("ui.apiDown")}
        </div>
      )}

      <ScrollArea className="flex-1 min-h-0 min-w-0">
        <div className="p-4 md:p-6 space-y-4 w-full">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-headline-md text-foreground">{t("dashboard.title")}</h1>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-semibold text-foreground">{periodCode}</span>
                {period !== "day" ? ` · ${rangeHint}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {periods.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPeriod(p.key)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-md border transition-colors ${
                    period === p.key
                      ? "border-primary bg-accent text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {loading || !stats ? (
            <div className="py-20 text-center text-sm text-muted-foreground">
              {t("ui.loading")}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    label: "OK",
                    value: stats.totals.ok,
                    tone: "border-success/30 bg-success-soft text-success",
                  },
                  {
                    label: "NG",
                    value: stats.totals.ng,
                    tone: "border-destructive/30 bg-destructive-soft text-destructive",
                  },
                  {
                    label: "MISSING",
                    value: stats.totals.missing,
                    tone: "border-border bg-card text-muted-foreground",
                  },
                  {
                    label: t("dashboard.compliance"),
                    value: `${stats.totals.compliance}%`,
                    tone: "border-primary/30 bg-accent text-primary",
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className={`rounded-xl border shadow-card p-4 ${card.tone}`}
                  >
                    <div className="text-label-caps uppercase opacity-80">{card.label}</div>
                    <div className="text-kpi font-kpi mt-1.5">{card.value}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                <h3 className="text-sm font-semibold mb-3">{t("dashboard.trend")}</h3>
                <ChartContainer config={seriesConfig} className="!aspect-auto h-[280px] w-full">
                  <BarChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="bucket"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={24}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      width={32}
                      domain={[0, "dataMax + 2"]}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar
                      dataKey="ok"
                      name="OK"
                      fill={STATUS_COLORS.ok}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="ng"
                      name="NG"
                      fill={STATUS_COLORS.ng}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="missing"
                      name="MISSING"
                      fill={STATUS_COLORS.missing}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ChartContainer>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <h3 className="text-sm font-semibold mb-3">{t("dashboard.statusShare")}</h3>
                  <ChartContainer config={seriesConfig} className="h-[220px] w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50}>
                        {pieData.map((entry) => (
                          <Cell key={entry.key} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <h3 className="text-sm font-semibold mb-3">{t("dashboard.byZone")}</h3>
                  <ChartContainer
                    config={{
                      checked: { label: t("dashboard.checked"), color: "hsl(var(--primary))" },
                      missing: { label: "MISSING", color: STATUS_COLORS.missing },
                    }}
                    className="h-[220px] w-full"
                  >
                    <BarChart data={byZoneData}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="zoneLabel" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="ok" stackId="a" fill={STATUS_COLORS.ok} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="ng" stackId="a" fill={STATUS_COLORS.ng} />
                      <Bar
                        dataKey="missing"
                        stackId="a"
                        fill={STATUS_COLORS.missing}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                <h3 className="text-sm font-semibold mb-3">{t("dashboard.incidents")}</h3>
                <ChartContainer
                  config={{
                    value: { label: t("dashboard.count"), color: "hsl(var(--primary))" },
                  }}
                  className="h-[200px] w-full"
                >
                  <BarChart data={incidentData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      <DatePickerAside
        title={t("dashboard.pickDate")}
        hint={t("dashboard.pickDateHint")}
        selected={anchor}
        onSelect={setAnchor}
      />
    </div>
  );
}
