import { ReactNode } from "react";
import { ArrowLeft, Cloud, CloudOff, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Button } from "@/components/ui/button";
import { getSession, logout } from "@/lib/auth-store";
import { tabletLabel } from "@/i18n/contentLabels";
import { toast } from "sonner";

interface AppShellProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  footer?: ReactNode;
  children: ReactNode;
  userName?: string;
}

export const AppShell = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  footer,
  children,
  userName,
}: AppShellProps) => {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const session = getSession();
  const displayName = tabletLabel(userName || session?.username);

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  const handleLogout = () => {
    logout();
    toast.message("Đã đăng xuất");
    navigate("/login?role=tablet", { replace: true });
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header
        className="flex-shrink-0 bg-primary text-primary-foreground shadow-elevated z-20"
        style={{ height: "var(--header-h)" }}
      >
        <div className="h-full flex items-center justify-between px-4 gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {showBack && (
              <button
                onClick={handleBack}
                className="touch-target -ml-2 flex items-center justify-center rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors"
                aria-label="Quay lại"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
            )}
            <div className="min-w-0">
              <div className="font-bold text-lg leading-tight truncate">{title}</div>
              {subtitle && (
                <div className="text-xs text-primary-foreground/80 truncate">{subtitle}</div>
              )}
            </div>
          </div>

          <div
            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              online ? "bg-success/20 text-white" : "bg-destructive/30 text-white"
            }`}
          >
            {online ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
            <span>{online ? "Online" : "Offline"}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10">
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">{displayName}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="touch-target text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
              aria-label="Đăng xuất"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="animate-fade-in">{children}</div>
      </main>

      {footer && (
        <footer
          className="flex-shrink-0 bg-card border-t border-border shadow-elevated z-10"
          style={{ minHeight: "var(--footer-h)" }}
        >
          {footer}
        </footer>
      )}
    </div>
  );
};
