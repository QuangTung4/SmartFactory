import { Navigate, useLocation } from "react-router-dom";
import { getSession, normalizeWebRole, type UserType } from "@/lib/auth-store";

type Props = {
  role: UserType | UserType[];
  children: React.ReactNode;
};

/** Chặn route web Quản lý nếu chưa login hoặc không phải manager/ceo */
export function RequireAuth({ role, children }: Props) {
  const location = useLocation();
  const session = getSession();
  const roles = Array.isArray(role) ? role : [role];

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const normalized = normalizeWebRole(session.userType) || session.userType;
  const allowed = roles.some((r) => {
    if (r === "admin" || r === "ceo") return normalized === "ceo";
    if (r === "manager") return normalized === "manager";
    return r === session.userType || r === normalized;
  });

  if (!allowed) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
