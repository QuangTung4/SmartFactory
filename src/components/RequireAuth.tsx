import { Navigate, useLocation } from "react-router-dom";
import { getSession, type UserType } from "@/lib/auth-store";

type Props = {
  role: UserType | UserType[];
  children: React.ReactNode;
};

/** Chặn route web Quản lý nếu chưa login hoặc không phải admin */
export function RequireAuth({ role, children }: Props) {
  const location = useLocation();
  const session = getSession();
  const roles = Array.isArray(role) ? role : [role];

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!roles.includes(session.userType)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
