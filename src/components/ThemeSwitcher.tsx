import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useLocale } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";

type Props = {
  /** primary = header xanh; muted = login / nền sáng-tối */
  variant?: "primary" | "muted";
  className?: string;
};

type Mode = "light" | "dark" | "system";

const ORDER: Mode[] = ["light", "dark", "system"];

/**
 * Chu kỳ Light → Dark → System. Lưu bằng next-themes (localStorage).
 */
export function ThemeSwitcher({ variant = "primary", className }: Props) {
  const { theme, setTheme } = useTheme();
  const { t } = useLocale();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className={cn("inline-flex h-8 w-[7.5rem] rounded-md border opacity-50", className)}
        aria-hidden
      />
    );
  }

  const current = (theme as Mode) || "system";

  return (
    <div
      className={cn("inline-flex items-center gap-1.5", className)}
      title={t("theme.switch")}
      role="group"
      aria-label={t("theme.switch")}
    >
      <div
        className={cn(
          "flex rounded-md overflow-hidden text-xs font-bold border",
          variant === "primary"
            ? "border-white/30 bg-white/10"
            : "border-border bg-card"
        )}
      >
        {ORDER.map((mode) => {
          const active = current === mode;
          const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setTheme(mode)}
              title={t(`theme.${mode}`)}
              className={cn(
                "px-2 py-1.5 transition-colors inline-flex items-center justify-center",
                variant === "primary"
                  ? active
                    ? "bg-white text-primary"
                    : "text-primary-foreground/80 hover:bg-white/15"
                  : active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="sr-only">{t(`theme.${mode}`)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
