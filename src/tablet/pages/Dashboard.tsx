import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  QrCode,
  MapPin,
  Clock,
  CheckCircle2,
  Circle,
  FileEdit,
  AlertOctagon,
} from "lucide-react";
import { AppShell } from "@/tablet/components/AppShell";
import { QrScanner } from "@/components/QrScanner";
import { ShiftBanner } from "@/components/ShiftBanner";
import { devices, Device } from "@/data/mockData";
import { useShiftWindow } from "@/hooks/useShiftWindow";
import {
  getSessionDeviceStatuses,
  loadSession,
} from "@/lib/inspection-session-store";
import { listHistoryBySession } from "@/lib/maintenance-history-store";
import type { DeviceWorkStatus } from "@/types/inspection";
import { toast } from "sonner";

const statusConfig: Record<
  DeviceWorkStatus,
  { label: string; className: string; Icon: typeof Circle }
> = {
  todo: { label: "Chưa làm", className: "bg-status-todo border-border", Icon: Circle },
  draft: { label: "Đang làm dở", className: "bg-status-draft border-warning/40", Icon: FileEdit },
  submitted: {
    label: "Đã gửi",
    className: "bg-status-done border-success/40",
    Icon: CheckCircle2,
  },
  missed: {
    label: "MISSING",
    className: "bg-destructive/10 border-destructive/40",
    Icon: AlertOctagon,
  },
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [scanOpen, setScanOpen] = useState(false);
  const zoneName =
    localStorage.getItem("zone_name") || localStorage.getItem("dept_name") || "Xưởng A";
  const shift = useShiftWindow();

  const deviceStatuses = useMemo(() => {
    void shift.flushTick;
    return getSessionDeviceStatuses(shift.sessionKey);
  }, [shift.sessionKey, shift.flushTick, shift.phase]);

  const sessionMeta = useMemo(() => {
    void shift.flushTick;
    return loadSession(shift.sessionKey);
  }, [shift.sessionKey, shift.flushTick]);

  const historyCount = useMemo(() => {
    void shift.flushTick;
    return listHistoryBySession(shift.sessionDate, shift.shift.id).length;
  }, [shift.sessionDate, shift.shift.id, shift.flushTick]);

  const enriched = useMemo(() => {
    return devices.map((d) => {
      const status = deviceStatuses[d.id] ?? "todo";
      const st = loadSession(shift.sessionKey).devices[d.id];
      return {
        ...d,
        status,
        lastCheck: st?.lastCheck,
        progress: st?.progress,
      } as Device & { status: DeviceWorkStatus };
    });
  }, [deviceStatuses, shift.sessionKey, shift.flushTick]);

  const stats = useMemo(() => {
    const total = enriched.length;
    const submitted = enriched.filter((d) => d.status === "submitted").length;
    const draft = enriched.filter((d) => d.status === "draft").length;
    const missed = enriched.filter((d) => d.status === "missed").length;
    const todo = enriched.filter((d) => d.status === "todo").length;
    return { total, submitted, draft, missed, todo };
  }, [enriched]);

  const onScan = (text: string) => {
    setScanOpen(false);
    toast.success(`Đã quét: ${text}`);
    navigate("/checklist/d3");
  };

  return (
    <>
      <AppShell
        title={zoneName}
        subtitle={`${shift.shift.label} · ${shift.sessionDate} · SmartFactory`}
        showBack
        onBack={() => navigate("/tablet")}
        footer={
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="text-sm">
              <div className="font-bold text-foreground">
                {stats.submitted}/{stats.total} thiết bị đã gửi
              </div>
              <div className="text-muted-foreground text-xs">
                {stats.draft} đang làm · {stats.todo} chưa làm
                {stats.missed > 0 ? ` · ${stats.missed} MISSING` : ""}
              </div>
            </div>
            <div className="flex-1 max-w-xs h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-success transition-all"
                style={{
                  width: `${stats.total ? (stats.submitted / stats.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        }
      >
        <div className="p-4 md:p-6 pb-28">
          <ShiftBanner
            shiftLabel={shift.shift.label}
            phase={shift.phase}
            label={shift.label}
            countdown={shift.countdown}
            canSubmit={shift.canSubmit}
            syncedAt={sessionMeta.syncedAt}
            historyCount={historyCount}
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard label="Đã gửi" value={stats.submitted} variant="success" />
            <StatCard label="Đang làm" value={stats.draft} variant="warning" />
            <StatCard label="Chưa làm" value={stats.todo} variant="muted" />
            <StatCard label="MISSING" value={stats.missed} variant="danger" />
          </div>

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground">Thiết bị cần kiểm tra</h2>
            <span className="text-sm text-muted-foreground">{devices.length} máy</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enriched.map((d) => {
              const cfg = statusConfig[d.status];
              const Icon = cfg.Icon;
              return (
                <button
                  key={d.id}
                  onClick={() => navigate(`/checklist/${d.id}`)}
                  className={`text-left rounded-2xl border-2 p-4 md:p-5 shadow-card hover:shadow-elevated active:scale-[0.99] transition-all ${cfg.className}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-mono text-muted-foreground mb-1">{d.code}</div>
                      <div className="font-bold text-base md:text-lg text-foreground leading-tight">
                        {d.name}
                      </div>
                    </div>
                    <Icon
                      className={`h-6 w-6 flex-shrink-0 ${
                        d.status === "submitted"
                          ? "text-success"
                          : d.status === "draft"
                            ? "text-warning"
                            : d.status === "missed"
                              ? "text-destructive"
                              : "text-muted-foreground"
                      }`}
                    />
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {d.location}
                    </span>
                    {d.lastCheck && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {d.lastCheck}
                      </span>
                    )}
                  </div>

                  {d.status === "draft" && d.progress != null && (
                    <div className="h-1.5 rounded-full bg-warning/20 overflow-hidden">
                      <div className="h-full bg-warning" style={{ width: `${d.progress}%` }} />
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        d.status === "submitted"
                          ? "bg-success/15 text-success"
                          : d.status === "draft"
                            ? "bg-warning/20 text-warning-foreground"
                            : d.status === "missed"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {cfg.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => setScanOpen(true)}
          className="fixed bottom-24 right-6 md:right-10 z-30 w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary text-primary-foreground shadow-fab flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Quét mã QR"
        >
          <span className="absolute inset-0 rounded-full bg-primary animate-pulse-ring" />
          <QrCode className="h-7 w-7 md:h-8 md:w-8 relative" />
        </button>
      </AppShell>

      <QrScanner open={scanOpen} onClose={() => setScanOpen(false)} onScan={onScan} />
    </>
  );
};

const StatCard = ({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "success" | "warning" | "muted" | "danger";
}) => {
  const styles = {
    success: "bg-success-soft text-success border-success/30",
    warning: "bg-warning-soft text-warning-foreground border-warning/30",
    muted: "bg-card text-foreground border-border",
    danger: "bg-destructive/10 text-destructive border-destructive/30",
  }[variant];
  return (
    <div className={`rounded-xl border-2 p-3 md:p-4 ${styles}`}>
      <div className="text-2xl md:text-3xl font-bold leading-none">{value}</div>
      <div className="text-xs md:text-sm font-medium mt-1 opacity-80">{label}</div>
    </div>
  );
};

export default Dashboard;
