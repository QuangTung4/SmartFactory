import { AlertTriangle, Clock, Lock, Unlock } from "lucide-react";
import type { ShiftPhase } from "@/lib/shift-window";

type Props = {
  shiftLabel: string;
  phase: ShiftPhase;
  label: string;
  countdown: string;
  canSubmit: boolean;
  syncedAt?: string | null;
  historyCount?: number;
};

export function ShiftBanner({
  shiftLabel,
  phase,
  label,
  countdown,
  canSubmit,
  syncedAt,
  historyCount,
}: Props) {
  const styles =
    phase === "submit_open"
      ? "bg-success text-success-foreground"
      : phase === "before_open"
        ? "bg-primary text-primary-foreground"
        : "bg-muted-foreground text-primary-foreground";

  const Icon = canSubmit ? Unlock : phase === "before_open" ? Clock : Lock;

  return (
    <div className={`rounded-xl ${styles} p-4 md:p-5 shadow-card mb-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-label-caps uppercase opacity-90">
            <Icon className="h-4 w-4" />
            {shiftLabel}
          </div>
          <div className="text-base md:text-lg font-bold mt-1 leading-snug">{label}</div>
          {phase === "locked" && syncedAt && (
            <div className="text-sm mt-2 opacity-90">
              Đã lưu lịch sử bảo trì
              {typeof historyCount === "number" ? ` · ${historyCount} máy` : ""}
            </div>
          )}
          {phase === "locked" && !syncedAt && (
            <div className="flex items-center gap-1.5 text-sm mt-2 opacity-90">
              <AlertTriangle className="h-4 w-4" />
              Đang đồng bộ dữ liệu lên máy chủ…
            </div>
          )}
        </div>
        {(phase === "submit_open" || phase === "before_open") && (
          <div className="text-right flex-shrink-0">
            <div className="text-2xl md:text-3xl font-bold font-kpi leading-none">{countdown}</div>
            <div className="text-xs opacity-80 mt-1">
              {phase === "submit_open" ? "còn lại đến khóa" : "đến giờ mở gửi"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
