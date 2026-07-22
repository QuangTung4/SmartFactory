import { useCallback, useEffect, useMemo, useState } from "react";
import { finalizeAndFlushSession } from "@/lib/inspection-session-store";
import { api } from "@/lib/api";
import {
  formatCountdown,
  getShiftContext,
  resolveNow,
  type ShiftContext,
} from "@/lib/shift-window";
import { toast } from "sonner";

function getDept() {
  return {
    id: localStorage.getItem("dept_id") || "mech",
    name: localStorage.getItem("dept_name") || "Bộ phận Cơ khí",
  };
}

export function useShiftWindow() {
  const [now, setNow] = useState(() => resolveNow());
  const [flushTick, setFlushTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(resolveNow());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const ctx: ShiftContext = useMemo(() => getShiftContext(now), [now]);

  const tryFlush = useCallback(() => {
    if (ctx.phase !== "locked") return;
    const dept = getDept();
    const result = finalizeAndFlushSession({
      sessionKey: ctx.sessionKey,
      departmentId: dept.id,
      departmentName: dept.name,
      now,
    });
    if (!result.alreadySynced && result.synced) {
      toast.success(`Đã đồng bộ ${result.count} thiết bị vào lịch sử bảo trì`);
      setFlushTick((t) => t + 1);
    }
    // Also push MISSING rows to SQL Server (idempotent; no-op if before deadline)
    void api
      .finalizeShift()
      .then((r) => {
        if (!r.skipped && r.inserted > 0) {
          toast.message(`Server đã ghi ${r.inserted} thiết bị MISSING`);
        }
      })
      .catch(() => {
        /* server offline — local history still flushed */
      });
  }, [ctx.phase, ctx.sessionKey, now]);

  useEffect(() => {
    tryFlush();
  }, [tryFlush]);

  const countdown = formatCountdown(ctx.msRemaining);

  return {
    now,
    ...ctx,
    countdown,
    flushTick,
    refresh: () => setNow(resolveNow()),
  };
}
