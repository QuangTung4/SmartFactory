import { AnswerValue, Question } from "@/data/mockData";
import { PhotoGallery } from "./PhotoGallery";

export type AnswerState = {
  value: AnswerValue;
  note?: string;
  photos?: string[];
};

interface Props {
  index: number;
  question: Question;
  state: AnswerState;
  onChange: (next: AnswerState) => void;
}

export const ChecklistQuestion = ({ index, question, state, onChange }: Props) => {
  const setValue = (value: AnswerValue) => onChange({ ...state, value });
  const photos = state.photos ?? [];

  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-5 shadow-card">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 text-primary font-bold text-base flex items-center justify-center">
          {index}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground leading-snug text-base md:text-[17px]">
            {question.text}
          </div>
          {question.hint && (
            <div className="text-sm text-muted-foreground mt-1">{question.hint}</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <AnswerButton
          active={state.value === "pass"}
          onClick={() => setValue("pass")}
          variant="pass"
          label="OK"
        />
        <AnswerButton
          active={state.value === "fail"}
          onClick={() => setValue("fail")}
          variant="fail"
          label="NG"
        />
        <AnswerButton
          active={state.value === "na"}
          onClick={() => setValue("na")}
          variant="na"
          label="N/A"
        />
      </div>

      {state.value === "fail" && (
        <div className="mt-4 p-4 rounded-xl bg-warning-soft border border-warning/40 animate-fade-in space-y-3">
          <div className="text-sm font-semibold text-warning-foreground">
            NG — bắt buộc nhập lý do hỏng hóc và chụp ảnh hiện trường
          </div>

          <textarea
            value={state.note || ""}
            onChange={(e) => onChange({ ...state, note: e.target.value })}
            placeholder="Mô tả chi tiết lỗi (Task Incident)..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />

          <PhotoGallery
            compact
            photos={photos}
            onChange={(next) => onChange({ ...state, photos: next })}
            max={4}
          />
        </div>
      )}
    </div>
  );
};

const AnswerButton = ({
  active,
  onClick,
  variant,
  label,
}: {
  active: boolean;
  onClick: () => void;
  variant: "pass" | "fail" | "na";
  label: string;
}) => {
  const base =
    "rounded-xl font-bold text-base md:text-lg border-2 transition-all active:scale-95 py-3.5 md:py-4";
  const styles = {
    pass: active
      ? "bg-success text-success-foreground border-success shadow-card"
      : "bg-card text-success border-success/40 hover:bg-success-soft",
    fail: active
      ? "bg-destructive text-destructive-foreground border-destructive shadow-card"
      : "bg-card text-destructive border-destructive/40 hover:bg-destructive-soft",
    na: active
      ? "bg-muted-foreground text-background border-muted-foreground shadow-card"
      : "bg-card text-muted-foreground border-border hover:bg-muted",
  }[variant];
  return (
    <button onClick={onClick} className={`${base} ${styles}`}>
      {label}
    </button>
  );
};
