import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "danger" | "muted" | "primary";

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  compact = false,
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: typeof CheckCircle2;
  tone: Tone;
  compact?: boolean;
}) {
  const tones = {
    success: "border-success/30 bg-success-soft text-success",
    danger: "border-destructive/30 bg-destructive/10 text-destructive",
    muted: "border-border bg-card text-foreground",
    primary: "border-primary/30 bg-primary/10 text-primary",
  }[tone];

  return (
    <div className={cn("rounded-xl border-2", compact ? "p-2.5" : "p-4", tones)}>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">
          {label}
        </span>
        <Icon className={cn("opacity-80", compact ? "h-4 w-4" : "h-5 w-5")} />
      </div>
      <div
        className={cn(
          "font-bold leading-none tabular-nums",
          compact ? "text-2xl" : "text-3xl"
        )}
      >
        {value}
      </div>
      {!compact && <div className="text-xs mt-1.5 opacity-70">{hint}</div>}
    </div>
  );
}
