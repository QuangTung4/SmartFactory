import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  AlertTriangle,
  Columns3,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileStack,
  LayoutDashboard,
  Package,
  ScrollText,
  Users,
  Wrench,
} from "lucide-react";
import { useLocale } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "manager_sidebar_collapsed";

const items = [
  { to: "/manager", end: true, icon: LayoutDashboard, labelKey: "nav.dashboard", comingSoon: false },
  { to: "/manager/devices", end: false, icon: Wrench, labelKey: "nav.devices", comingSoon: true },
  { to: "/manager/inspections", end: false, icon: ClipboardCheck, labelKey: "nav.inspections", comingSoon: true },
  { to: "/manager/maintenance", end: false, icon: CalendarClock, labelKey: "nav.maintenance", comingSoon: true },
  { to: "/manager/reports", end: false, icon: ClipboardList, labelKey: "nav.reports", comingSoon: false },
  { to: "/manager/library", end: false, icon: FileStack, labelKey: "nav.library", comingSoon: false },
  { to: "/manager/incidents", end: false, icon: AlertTriangle, labelKey: "nav.incidents", comingSoon: false },
  { to: "/manager/kanban", end: false, icon: Columns3, labelKey: "nav.kanban", comingSoon: false },
  { to: "/manager/inspection-log", end: false, icon: ScrollText, labelKey: "nav.inspectionLog", comingSoon: false },
  { to: "/manager/users", end: false, icon: Users, labelKey: "nav.users", comingSoon: true },
  { to: "/manager/parts", end: false, icon: Package, labelKey: "nav.parts", comingSoon: true },
] as const;

type Props = {
  collapsed: boolean;
  onToggle: () => void;
};

export function ManagerSidebar({ collapsed, onToggle }: Props) {
  const { t } = useLocale();

  return (
    <aside
      className={cn(
        "flex-shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col transition-[width] duration-200 ease-out",
        collapsed ? "w-[56px]" : "w-56 md:w-60"
      )}
    >
      <div
        className={cn(
          "border-b border-sidebar-border flex items-center gap-2",
          collapsed ? "px-1.5 py-2 justify-center" : "px-3 py-2.5 justify-between"
        )}
      >
        {!collapsed && (
          <div className="text-label-caps uppercase text-muted-foreground truncate">
            {t("nav.menu")}
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={onToggle}
          title={collapsed ? t("nav.expand") : t("nav.collapse")}
          aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
      <nav className="flex-1 p-1.5 space-y-1 overflow-y-auto overflow-x-hidden">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={t(item.labelKey)}
              className={({ isActive }) =>
                cn(
                  "flex items-center rounded-md text-sm font-medium transition-colors",
                  collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2.5",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )
              }
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && (
                <span className="truncate flex-1 min-w-0">{t(item.labelKey)}</span>
              )}
              {!collapsed && item.comingSoon && (
                <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {t("nav.soon")}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  return {
    collapsed,
    toggle: () => setCollapsed((c) => !c),
  };
}
