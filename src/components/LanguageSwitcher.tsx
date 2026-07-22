import { Languages } from "lucide-react";
import { useLocale } from "@/i18n/LocaleContext";
import { LOCALE_LABEL, type AppLocale } from "@/i18n/locales";
import { cn } from "@/lib/utils";

type Props = {
  /** primary = trên header xanh; muted = trang login sáng */
  variant?: "primary" | "muted";
  className?: string;
};

const ORDER: AppLocale[] = ["vi", "en", "ko"];

export function LanguageSwitcher({ variant = "primary", className }: Props) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      className={cn("inline-flex items-center gap-1.5", className)}
      title={t("lang.switch")}
      role="group"
      aria-label={t("lang.switch")}
    >
      <Languages
        className={cn(
          "h-4 w-4 flex-shrink-0",
          variant === "primary" ? "opacity-80" : "text-muted-foreground"
        )}
      />
      <div
        className={cn(
          "flex rounded-lg overflow-hidden text-xs font-bold border",
          variant === "primary"
            ? "border-white/30 bg-white/10"
            : "border-border bg-card"
        )}
      >
        {ORDER.map((code) => {
          const active = locale === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              className={cn(
                "px-2.5 py-1.5 uppercase transition-colors",
                variant === "primary"
                  ? active
                    ? "bg-white text-primary"
                    : "text-primary-foreground/80 hover:bg-white/15"
                  : active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
              )}
            >
              {LOCALE_LABEL[code]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
