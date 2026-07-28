import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/LocaleContext";
import { zoneLabel } from "@/i18n/contentLabels";

export type ZoneOption = {
  code: string;
  name?: string | null;
};

export type FilterSelectOption = {
  value: string;
  label: string;
};

type FilterSelectProps = {
  label: string;
  value: string;
  options: FilterSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  size?: "sm" | "md";
};

/** Lọc gọn dạng list/select thay vì hàng chip. */
export function FilterSelect({
  label,
  value,
  options,
  onChange,
  className,
  size = "md",
}: FilterSelectProps) {
  const text = size === "sm" ? "text-[10px]" : "text-[11px]";
  const h = size === "sm" ? "h-7" : "h-8";

  return (
    <label className={cn("inline-flex items-center gap-1.5 min-w-0", className)}>
      <span className={cn("font-semibold text-muted-foreground whitespace-nowrap", text)}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "min-w-[7.5rem] max-w-[14rem] rounded-md border border-border bg-background px-2 font-semibold text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-primary/40",
          text,
          h
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type ZoneProps = {
  zones: ZoneOption[];
  value: string | "ALL";
  onChange: (code: string | "ALL") => void;
  className?: string;
  size?: "sm" | "md";
};

/** Bộ lọc bộ phận — dropdown list. */
export function ZoneFilterBar({ zones, value, onChange, className, size = "md" }: ZoneProps) {
  const { t, locale } = useLocale();
  const options: FilterSelectOption[] = [
    { value: "ALL", label: t("report.zoneAll") },
    ...zones.map((z) => ({
      value: z.code,
      label: `${z.code} · ${zoneLabel(z.code, locale, z.name || z.code)}`,
    })),
  ];

  return (
    <FilterSelect
      label={t("report.zoneFilter")}
      value={value}
      options={options}
      onChange={(v) => onChange(v === "ALL" ? "ALL" : v)}
      className={className}
      size={size}
    />
  );
}
