import { Outlet, useNavigate } from "react-router-dom";
import { LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLocale } from "@/i18n/LocaleContext";
import { toast } from "sonner";
import { getSession, logout } from "@/lib/auth-store";
import { ManagerSidebar, useSidebarCollapsed } from "./components/ManagerSidebar";

/**
 * Shell riêng cho Webapp Quản lý — tách biệt hoàn toàn với AppShell (tablet).
 */
export default function ManagerLayout() {
  const navigate = useNavigate();
  const session = getSession();
  const { t } = useLocale();
  const { collapsed, toggle } = useSidebarCollapsed();

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="flex-shrink-0 border-b border-border bg-primary text-primary-foreground px-4 md:px-6 py-3">
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-3 min-w-0">
            <ShieldCheck className="h-7 w-7 flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-bold text-lg leading-tight truncate">
                SmartFactory · {t("app.controlRoom")}
              </div>
              <div className="text-xs opacity-80 truncate">
                {t("app.managerWeb")} · {session?.username || "admin"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <LanguageSwitcher variant="primary" />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                logout();
                toast.message(t("app.loggedOut"));
                navigate("/login", { replace: true });
              }}
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              {t("app.logout")}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex">
        <ManagerSidebar collapsed={collapsed} onToggle={toggle} />
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
