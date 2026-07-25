import { FormEvent, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Lock, Monitor, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useLocale } from "@/i18n/LocaleContext";
import {
  DEMO_PASSWORD,
  getSession,
  listSeedUsernames,
  login,
  loginRemote,
  logout,
} from "@/lib/auth-store";
import { toast } from "sonner";

/**
 * Đăng nhập Webapp Quản lý (admin) — ưu tiên API / SmartFactoryDB.
 */
const LoginPage = () => {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [busy, setBusy] = useState(false);
  const adminAccounts = useMemo(
    () => listSeedUsernames().filter((a) => a.userType === "admin"),
    []
  );

  useEffect(() => {
    const s = getSession();
    if (s?.userType === "tablet") logout();
  }, []);

  const session = getSession();
  if (session?.userType === "admin") {
    return <Navigate to="/manager" replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      let user;
      try {
        user = await loginRemote(username, password);
      } catch {
        user = login(username, password);
        if (!user) throw new Error(t("login.badCreds"));
        toast.message(t("login.apiOffline"));
      }

      if (user.userType !== "admin") {
        logout();
        toast.error(t("login.tabletOnly"));
        return;
      }
      toast.success(t("login.hello", { name: user.username }));
      navigate("/manager", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("login.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative">
      <div className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-2">
        <ThemeSwitcher variant="muted" />
        <LanguageSwitcher variant="muted" />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-primary text-primary-foreground mb-4 shadow-card">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">
            {t("app.brand")}
          </p>
          <h1 className="text-headline-lg text-foreground mb-1">
            {t("app.controlRoom")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-xl border border-border bg-card p-6 md:p-8 shadow-elevated space-y-4"
        >
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">
              {t("login.username")}
            </label>
            <div className="relative">
              <Monitor className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full h-12 pl-10 pr-3 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                placeholder="admin"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">
              {t("login.password")}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full h-12 pl-10 pr-3 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full h-12 text-base" disabled={busy}>
            {busy ? t("login.submitting") : t("login.submit")}
          </Button>

          <div className="pt-2 border-t border-border">
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              {t("login.demoAccounts")}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {adminAccounts.map((a) => (
                <button
                  key={a.username}
                  type="button"
                  onClick={() => {
                    setUsername(a.username);
                    setPassword(DEMO_PASSWORD);
                  }}
                  className="text-[11px] font-mono px-2 py-1 rounded-md border border-border bg-muted/40 hover:border-primary hover:text-primary text-foreground transition-colors"
                >
                  {a.username}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {t("login.demoPassword")}: <span className="font-mono">{DEMO_PASSWORD}</span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
