import { AlertTriangle, CheckCircle2, CircleSlash, Percent } from "lucide-react";
import { useLocale } from "@/i18n/LocaleContext";
import type { DayKpis } from "@/lib/manager-store";
import { KpiCard } from "./KpiCard";
import { cn } from "@/lib/utils";

export function KpiStrip({
  kpis,
  compact = false,
}: {
  kpis: DayKpis;
  compact?: boolean;
}) {
  const { t } = useLocale();

  return (
    <div
      className={cn(
        "flex-shrink-0 border-b border-border bg-card",
        compact ? "px-3 py-2.5" : "px-4 md:px-6 py-4"
      )}
    >
      <div className={cn("text-xs text-muted-foreground", compact ? "mb-2" : "mb-3")}>
        {kpis.shiftLabel} · {kpis.sessionDate}
      </div>
      <div className={cn("grid grid-cols-2 xl:grid-cols-4", compact ? "gap-2" : "gap-3")}>
        <KpiCard
          label="OK"
          value={kpis.ok}
          hint={t("kpi.okHint")}
          icon={CheckCircle2}
          tone="success"
          compact={compact}
        />
        <KpiCard
          label="NG"
          value={kpis.ng}
          hint={t("kpi.ngHint")}
          icon={AlertTriangle}
          tone="danger"
          compact={compact}
        />
        <KpiCard
          label="MISSING"
          value={kpis.pending + kpis.missing}
          hint={t("kpi.missingHint")}
          icon={CircleSlash}
          tone="muted"
          compact={compact}
        />
        <KpiCard
          label="Compliance"
          value={`${kpis.compliance}%`}
          hint={t("kpi.complianceHint")}
          icon={Percent}
          tone="primary"
          compact={compact}
        />
      </div>
    </div>
  );
}
