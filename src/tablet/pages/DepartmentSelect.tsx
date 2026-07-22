import { useNavigate } from "react-router-dom";
import {
  Wrench,
  Zap,
  ShieldCheck,
  Factory,
  BadgeCheck,
  Forklift,
  LucideIcon,
  LogOut,
} from "lucide-react";
import { zones } from "@/data/mockData";
import { getSession, logout } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const iconMap: Record<string, LucideIcon> = {
  Wrench,
  Zap,
  ShieldCheck,
  Factory,
  BadgeCheck,
  Forklift,
};

/**
 * Màn chọn Zone — Tablet
 * Nếu login đã gán UserZoneAssignments → hiện nút vào thẳng zone đó.
 */
const ZoneSelect = () => {
  const navigate = useNavigate();
  const session = getSession();

  const select = (id: string, name: string) => {
    localStorage.setItem("zone_id", id);
    localStorage.setItem("zone_name", name);
    localStorage.setItem("dept_id", id);
    localStorage.setItem("dept_name", name);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-accent/30">
      <div className="absolute top-4 right-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            logout();
            toast.message("Đã đăng xuất");
            navigate("/login?role=tablet", { replace: true });
          }}
        >
          <LogOut className="h-4 w-4 mr-1.5" />
          {session?.username || "tablet"}
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-5xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <ShieldCheck className="h-4 w-4" />
              SmartFactory Check & Chat
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Chọn khu vực làm việc
            </h1>
            <p className="text-muted-foreground text-base">
              Đăng nhập: <span className="font-mono font-semibold text-foreground">{session?.username}</span>
              {session?.zoneName ? ` · Zone mặc định: ${session.zoneName}` : ""}
            </p>
            {session?.zoneId && session.zoneName && (
              <Button
                className="mt-4"
                size="lg"
                onClick={() => select(session.zoneId!, session.zoneName!)}
              >
                Vào {session.zoneName}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {zones.map((zone) => {
              const Icon = iconMap[zone.icon];
              const assigned = session?.zoneId === zone.id;
              return (
                <button
                  key={zone.id}
                  onClick={() => select(zone.id, zone.name)}
                  className={`group relative bg-card border-2 rounded-2xl p-6 md:p-8 shadow-card hover:shadow-elevated transition-all active:scale-[0.98] text-left ${
                    assigned ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary"
                  }`}
                >
                  <div
                    className="w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${zone.color}20` }}
                  >
                    {Icon && <Icon className="h-7 w-7 md:h-8 md:w-8" style={{ color: zone.color }} />}
                  </div>
                  <div className="font-bold text-lg md:text-xl text-foreground">{zone.name}</div>
                  <div className="text-sm text-muted-foreground mt-1 font-mono">{zone.id}</div>
                  {assigned && (
                    <div className="absolute top-3 right-3 text-[10px] font-bold uppercase text-primary">
                      Gán sẵn
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZoneSelect;
