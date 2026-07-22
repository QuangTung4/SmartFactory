import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  dictionaries,
  formatMessage,
  type AppLocale,
} from "./locales";

const STORAGE_KEY = "sf_ui_locale_v1";

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): AppLocale {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "vi" || raw === "en" || raw === "ko") return raw;
  } catch {
    /* ignore */
  }
  return "vi";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(readStoredLocale);

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next === "ko" ? "ko" : next === "en" ? "en" : "vi";
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "ko" ? "ko" : locale === "en" ? "en" : "vi";
  }, [locale]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = dictionaries[locale] || dictionaries.vi;
      const fallback = dictionaries.vi[key] || key;
      return formatMessage(dict[key] ?? fallback, vars);
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
