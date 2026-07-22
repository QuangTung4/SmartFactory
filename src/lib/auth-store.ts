/**
 * Auth — session local; login ưu tiên API (SmartFactoryDB).
 * Username cứng, không email / FullName.
 * UserType: admin | tablet
 */

import { api } from "@/lib/api";

export type UserType = "admin" | "tablet";

export type AuthUser = {
  userId: number;
  username: string;
  userType: UserType;
  /** Zone gợi ý cho tablet (UserZoneAssignments) */
  zoneId?: string;
  zoneName?: string;
};

const SESSION_KEY = "sf_auth_session_v1";

/** Mật khẩu demo chung */
export const DEMO_PASSWORD = "123456";

type SeedAccount = AuthUser & { password: string };

const SEED: SeedAccount[] = [
  { userId: 1, username: "admin", userType: "admin", password: DEMO_PASSWORD },
  { userId: 2, username: "tablet1", userType: "tablet", zoneId: "BP1", zoneName: "Bộ phận 1", password: DEMO_PASSWORD },
  { userId: 3, username: "tablet2", userType: "tablet", zoneId: "BP1", zoneName: "Bộ phận 1", password: DEMO_PASSWORD },
  { userId: 4, username: "tablet3", userType: "tablet", zoneId: "BP2", zoneName: "Bộ phận 2", password: DEMO_PASSWORD },
  { userId: 5, username: "tablet4", userType: "tablet", zoneId: "BP2", zoneName: "Bộ phận 2", password: DEMO_PASSWORD },
  { userId: 6, username: "tablet5", userType: "tablet", zoneId: "BP3", zoneName: "Bộ phận 3", password: DEMO_PASSWORD },
  { userId: 7, username: "tablet6", userType: "tablet", zoneId: "BP4", zoneName: "Bộ phận 4", password: DEMO_PASSWORD },
  { userId: 8, username: "tablet7", userType: "tablet", zoneId: "BP5", zoneName: "Bộ phận 5", password: DEMO_PASSWORD },
  { userId: 9, username: "tablet8", userType: "tablet", zoneId: "BP6", zoneName: "Bộ phận 6", password: DEMO_PASSWORD },
  { userId: 10, username: "tablet9", userType: "tablet", zoneId: "BP1", zoneName: "Bộ phận 1", password: DEMO_PASSWORD },
  { userId: 11, username: "tablet10", userType: "tablet", zoneId: "BP2", zoneName: "Bộ phận 2", password: DEMO_PASSWORD },
];

export function listSeedUsernames(): { username: string; userType: UserType }[] {
  return SEED.map(({ username, userType }) => ({ username, userType }));
}

function saveSession(session: AuthUser): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  if (session.userType === "tablet" && session.zoneId) {
    localStorage.setItem("zone_id", session.zoneId);
    localStorage.setItem("zone_name", session.zoneName || session.zoneId);
    localStorage.setItem("dept_id", session.zoneId);
    localStorage.setItem("dept_name", session.zoneName || session.zoneId);
  }
}

/** Login local (fallback / offline demo) */
export function login(username: string, password: string): AuthUser | null {
  const u = SEED.find(
    (a) => a.username.toLowerCase() === username.trim().toLowerCase() && a.password === password
  );
  if (!u) return null;

  const session: AuthUser = {
    userId: u.userId,
    username: u.username,
    userType: u.userType,
    zoneId: u.zoneId,
    zoneName: u.zoneName,
  };
  saveSession(session);
  return session;
}

/** Login qua API → Users trong SmartFactoryDB */
export async function loginRemote(username: string, password: string): Promise<AuthUser> {
  const row = await api.login(username, password);
  const session: AuthUser = {
    userId: row.userId,
    username: row.username,
    userType: row.userType,
    zoneId: row.zoneCode ?? undefined,
    zoneName: row.zoneName ?? undefined,
  };
  saveSession(session);
  return session;
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function getSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function requireRole(role: UserType | UserType[]): AuthUser | null {
  const s = getSession();
  if (!s) return null;
  const roles = Array.isArray(role) ? role : [role];
  return roles.includes(s.userType) ? s : null;
}
