import { Construction } from "lucide-react";
import { useLocale } from "@/i18n/LocaleContext";

type Props = {
  /** Optional title key; defaults to coming soon title */
  titleKey?: string;
};

/** Placeholder for CMMS nav items not yet backed by core APIs. */
export default function ComingSoonPage({ titleKey }: Props) {
  const { t } = useLocale();
  return (
    <div className="flex flex-1 min-h-[50vh] items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border border-border bg-card shadow-card px-8 py-12 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Construction className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">
          {titleKey ? t(titleKey) : t("comingSoon.title")}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("comingSoon.body")}
        </p>
      </div>
    </div>
  );
}
