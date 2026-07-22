import { startOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { buttonVariants } from "@/components/ui/button";
import { useLocale } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  hint?: string;
  selected: Date;
  onSelect: (d: Date) => void;
  showTodayLink?: boolean;
  onToday?: () => void;
};

/** Cột lịch — thẻ lịch lớn hơn, dùng chung mọi trang */
export function DatePickerAside({
  title,
  hint,
  selected,
  onSelect,
  showTodayLink,
  onToday,
}: Props) {
  const { t } = useLocale();

  return (
    <aside
      className={cn(
        "flex-shrink-0 w-full lg:w-[320px]",
        "border-t lg:border-t-0 lg:border-l border-border bg-muted/30",
        "flex justify-center lg:items-start p-4"
      )}
    >
      <div className="w-[288px] rounded-xl border border-border bg-card shadow-sm flex flex-col items-center p-4 gap-3">
        <div className="text-center w-full">
          <div className="text-sm font-semibold text-foreground leading-tight">{title}</div>
          {hint && (
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug line-clamp-2">
              {hint}
            </p>
          )}
        </div>

        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => d && onSelect(startOfDay(d))}
          className="p-0 mx-auto"
          classNames={{
            months: "flex flex-col",
            month: "space-y-3",
            caption: "flex justify-center relative items-center h-9 mb-1",
            caption_label: "text-sm font-semibold",
            nav: "space-x-1 flex items-center",
            nav_button: cn(
              buttonVariants({ variant: "outline" }),
              "h-8 w-8 bg-transparent p-0 opacity-60 hover:opacity-100"
            ),
            nav_button_previous: "absolute left-0",
            nav_button_next: "absolute right-0",
            table: "w-full border-collapse",
            head_row: "flex",
            head_cell:
              "text-muted-foreground rounded-md w-9 font-normal text-[0.75rem]",
            row: "flex w-full mt-1.5",
            cell: "h-9 w-9 text-center text-sm p-0 relative",
            day: cn(
              buttonVariants({ variant: "ghost" }),
              "h-9 w-9 p-0 font-normal text-sm aria-selected:opacity-100"
            ),
          }}
        />

        {showTodayLink && onToday && (
          <button
            type="button"
            className="text-xs font-semibold text-primary hover:underline"
            onClick={onToday}
          >
            {t("report.backToday")}
          </button>
        )}
      </div>
    </aside>
  );
}
