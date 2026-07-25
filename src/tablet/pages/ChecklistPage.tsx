import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, Save, Send, CheckCircle2, AlertTriangle, FileText, Lock } from "lucide-react";
import { AppShell } from "@/tablet/components/AppShell";
import { ChecklistQuestion, AnswerState } from "@/components/ChecklistQuestion";
import { SignaturePad } from "@/components/SignaturePad";
import { PhotoGallery } from "@/components/PhotoGallery";
import { ShiftBanner } from "@/components/ShiftBanner";
import { devices, sampleChecklist } from "@/data/mockData";
import { useShiftWindow } from "@/hooks/useShiftWindow";
import {
  earlySubmitToHistory,
  getDeviceState,
  loadSession,
  saveDraft,
} from "@/lib/inspection-session-store";
import { listHistoryBySession } from "@/lib/maintenance-history-store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ChecklistPage = () => {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const device = devices.find((d) => d.id === deviceId) ?? devices[2];
  const checklist = sampleChecklist;
  const shift = useShiftWindow();

  const zoneId = localStorage.getItem("zone_id") || localStorage.getItem("dept_id") || "zone-a";
  const zoneName =
    localStorage.getItem("zone_name") || localStorage.getItem("dept_name") || "Xưởng A";

  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [openGroup, setOpenGroup] = useState<string | null>(checklist.groups[0].id);
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [generalNote, setGeneralNote] = useState("");
  /** DailyChecks.CheckedBy — bắt buộc khi gửi OK/NG */
  const [checkedBy, setCheckedBy] = useState("");

  useEffect(() => {
    const st = getDeviceState(shift.sessionKey, device.id);
    if (st.answers) setAnswers(st.answers as Record<string, AnswerState>);
    if (st.evidencePhotos) setEvidencePhotos(st.evidencePhotos);
    if (st.generalNote) setGeneralNote(st.generalNote);
  }, [shift.sessionKey, device.id]);

  const sessionMeta = useMemo(() => {
    void shift.flushTick;
    return loadSession(shift.sessionKey);
  }, [shift.sessionKey, shift.flushTick]);

  const historyCount = useMemo(() => {
    void shift.flushTick;
    return listHistoryBySession(shift.sessionDate, shift.shift.id).length;
  }, [shift.sessionDate, shift.shift.id, shift.flushTick]);

  const deviceWorkStatus = useMemo(() => {
    void shift.flushTick;
    return getDeviceState(shift.sessionKey, device.id).status;
  }, [shift.sessionKey, device.id, shift.flushTick]);

  const totals = useMemo(() => {
    const all = checklist.groups.flatMap((g) => g.questions);
    const answered = all.filter((q) => answers[q.id]?.value).length;
    const fails = all.filter((q) => answers[q.id]?.value === "fail").length;
    return { total: all.length, answered, fails, percent: Math.round((answered / all.length) * 100) };
  }, [answers, checklist]);

  const setAnswer = (qid: string, next: AnswerState) =>
    setAnswers((prev) => ({ ...prev, [qid]: next }));

  const handleSaveDraft = () => {
    saveDraft(shift.sessionKey, device.id, {
      answers,
      evidencePhotos,
      generalNote,
      progress: totals.percent,
    });
    toast.success("Đã lưu tạm bản nháp");
  };

  const submit = () => {
    if (!shift.canSubmit) {
      toast.error("Ngoài cửa sổ gửi — không thể gửi báo cáo");
      return;
    }
    if (deviceWorkStatus === "submitted") {
      toast.message("Thiết bị này đã gửi trong ca hiện tại");
      return;
    }
    if (totals.answered < totals.total) {
      toast.error(`Còn ${totals.total - totals.answered} câu chưa trả lời`);
      return;
    }

    if (!checkedBy.trim()) {
      toast.error("Vui lòng gõ họ tên xác nhận (CheckedBy)");
      return;
    }

    const fails = checklist.groups.flatMap((g) => g.questions).filter((q) => answers[q.id]?.value === "fail");
    for (const q of fails) {
      const a = answers[q.id];
      if (!a?.note?.trim()) {
        toast.error(`NG cần lý do: ${q.text}`);
        return;
      }
      if (!a.photos?.length) {
        toast.error(`NG cần ảnh hiện trường: ${q.text}`);
        return;
      }
    }

    const noteWithChecker = [generalNote.trim(), `CheckedBy: ${checkedBy.trim()}`]
      .filter(Boolean)
      .join("\n");

    const record = earlySubmitToHistory({
      sessionKey: shift.sessionKey,
      deviceId: device.id,
      deviceName: device.name,
      departmentId: zoneId,
      departmentName: zoneName,
      answers,
      evidencePhotos,
      generalNote: noteWithChecker,
    });

    toast.success(
      record.status === "ng"
        ? "Đã gửi NG — tạo Task Incident (sẽ mở chat khi gắn backend)"
        : "Đã gửi OK — DailyChecks"
    );
    setTimeout(() => navigate("/dashboard"), 800);
  };

  const sendDisabled =
    !shift.canSubmit || deviceWorkStatus === "submitted" || deviceWorkStatus === "missed";

  return (
    <AppShell
      title={device.name}
      subtitle={`${device.code} · ${device.location}`}
      showBack
      onBack={() => navigate("/dashboard")}
      footer={
        <div className="px-4 md:px-6 py-3 flex items-center gap-3 md:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs md:text-sm mb-1">
              <span className="font-semibold text-foreground">
                Tiến độ: {totals.answered}/{totals.total}
              </span>
              {totals.fails > 0 && (
                <span className="flex items-center gap-1 text-destructive font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" /> {totals.fails} NG
                </span>
              )}
            </div>
            <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${totals.percent}%` }}
              />
            </div>
          </div>
          <Button
            variant="outline"
            size="lg"
            onClick={handleSaveDraft}
            disabled={!shift.canSubmit || deviceWorkStatus === "submitted" || deviceWorkStatus === "missed"}
            className="touch-target h-12 md:h-14 px-4 md:px-6 text-base"
          >
            <Save className="h-5 w-5 mr-2" /> Lưu tạm
          </Button>
          <Button
            size="lg"
            onClick={submit}
            disabled={sendDisabled}
            className="touch-target h-12 md:h-14 px-5 md:px-7 text-base bg-success hover:bg-success/90 text-success-foreground disabled:opacity-50"
          >
            {sendDisabled && !shift.canSubmit ? (
              <Lock className="h-5 w-5 mr-2" />
            ) : (
              <Send className="h-5 w-5 mr-2" />
            )}
            Gửi báo cáo
          </Button>
        </div>
      }
    >
      <div
        className={`p-4 md:p-6 max-w-5xl mx-auto space-y-5 pb-12 ${
          !shift.canSubmit ? "opacity-60 pointer-events-none select-none" : ""
        }`}
      >
        <div className="pointer-events-auto opacity-100">
          <ShiftBanner
            shiftLabel={shift.shift.label}
            phase={shift.phase}
            label={shift.label}
            countdown={shift.countdown}
            canSubmit={shift.canSubmit}
            syncedAt={sessionMeta.syncedAt}
            historyCount={historyCount}
          />
        </div>

        {!shift.canSubmit && (
          <div className="pointer-events-auto opacity-100 rounded-xl border-2 border-destructive/40 bg-destructive/10 p-4 text-sm font-medium text-destructive">
            Form đã khóa (ngoài cửa sổ gửi). Deadline ca sáng 08:30 · ca đêm 20:30. Máy chưa gửi sẽ thành MISSING.
          </div>
        )}

        <div className="rounded-xl bg-primary text-primary-foreground p-5 md:p-6 shadow-card">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-label-caps uppercase opacity-80">
                Phiếu kiểm tra · {shift.shift.label}
              </div>
              <div className="text-lg md:text-2xl font-bold mt-1 truncate">
                Kiểm tra đầu ca
              </div>
              <div className="text-sm opacity-80 mt-1">
                {new Date().toLocaleDateString("vi-VN", {
                  weekday: "long",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
                {" · Zone: "}
                {zoneName}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-3xl md:text-4xl font-bold leading-none">{totals.percent}%</div>
              <div className="text-xs opacity-80 mt-1">hoàn thành</div>
            </div>
          </div>
        </div>

        {checklist.groups.map((group) => {
          const isOpen = openGroup === group.id;
          const groupAnswered = group.questions.filter((q) => answers[q.id]?.value).length;
          const groupFails = group.questions.filter((q) => answers[q.id]?.value === "fail").length;
          const allDone = groupAnswered === group.questions.length;

          return (
            <div
              key={group.id}
              className="rounded-xl bg-card border border-border shadow-card overflow-hidden"
            >
              <button
                onClick={() => setOpenGroup(isOpen ? null : group.id)}
                className="w-full flex items-center gap-3 px-5 py-5 hover:bg-muted/30 transition-colors text-left"
              >
                <div
                  className={`flex-shrink-0 w-2 h-12 rounded-full ${
                    allDone ? "bg-success" : groupFails > 0 ? "bg-destructive" : "bg-muted-foreground/30"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base md:text-lg text-foreground">{group.title}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {groupAnswered}/{group.questions.length} câu
                    {groupFails > 0 && (
                      <span className="text-destructive font-medium"> · {groupFails} NG</span>
                    )}
                  </div>
                </div>
                {allDone && <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0" />}
                <ChevronDown
                  className={`h-6 w-6 text-muted-foreground transition-transform flex-shrink-0 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-4 md:px-5 pb-5 pt-1 grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in border-t border-border bg-muted/20">
                  {group.questions.map((q, i) => (
                    <ChecklistQuestion
                      key={q.id}
                      index={i + 1}
                      question={q}
                      state={answers[q.id] ?? { value: null }}
                      onChange={(next) => setAnswer(q.id, next)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <PhotoGallery
          photos={evidencePhotos}
          onChange={setEvidencePhotos}
          max={6}
          label="Ảnh minh chứng tổng quát"
          hint="Chụp ảnh hiện trạng tổng thể của thiết bị (tối đa 6 ảnh)"
        />

        <div className="rounded-xl border border-border bg-card p-4 md:p-5">
          <label className="flex items-center gap-2 font-semibold text-foreground mb-2">
            <FileText className="h-5 w-5 text-primary" />
            Ghi chú chung
          </label>
          <textarea
            value={generalNote}
            onChange={(e) => setGeneralNote(e.target.value)}
            rows={3}
            placeholder="Nhận xét tổng quát về tình trạng thiết bị..."
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
        </div>

        {/* DailyChecks.CheckedBy — gõ tay họ tên khi gửi OK/NG */}
        <div className="rounded-xl border-2 border-primary/30 bg-card p-4 md:p-5">
          <label className="block font-semibold text-foreground mb-1">
            Họ tên người kiểm tra <span className="text-destructive">*</span>
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Bắt buộc khi gửi OK/NG · lưu vào DailyChecks.CheckedBy (MISSING để trống)
          </p>
          <input
            type="text"
            value={checkedBy}
            onChange={(e) => setCheckedBy(e.target.value)}
            placeholder="Nhập họ tên xác nhận..."
            className="w-full px-3 py-3 rounded-lg border border-border bg-background text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
            autoComplete="name"
          />
        </div>

        <div className="pt-1">
          <div className="text-base font-semibold text-foreground mb-2">
            Chữ ký xác nhận (tùy chọn)
          </div>
          <SignaturePad />
        </div>
      </div>
    </AppShell>
  );
};

export default ChecklistPage;
