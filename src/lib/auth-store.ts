/**
 * Auth — session local; login ưu tiên API (SmartFactoryDB).
 * UserType: manager | ceo (Web). Legacy admin → ceo.
 */

import { api } from "@/lib/api";

export type UserType = "manager" | "ceo" | "worker" | "checker" | "admin" | "tablet";

export type AuthUser = {
  userId: number;
  username: string;
  userType: UserType;
  permissionTier?: string;
  zoneId?: string;
  zoneName?: string;
};

const SESSION_KEY = "sf_auth_session_v1";

export const DEMO_PASSWORD = "123456";

type SeedAccount = AuthUser & { password: string };

const SEED: SeedAccount[] = [
  { userId: 1, username: "ceo", userType: "ceo", password: DEMO_PASSWORD },
  { userId: 2, username: "manager1", userType: "manager", password: DEMO_PASSWORD },
  { userId: 3, username: "manager2", userType: "manager", password: DEMO_PASSWORD },
];

export function normalizeWebRole(userType: string): "manager" | "ceo" | null {
  const t = String(userType || "").toLowerCase();
  if (t === "ceo" || t === "admin") return "ceo";
  if (t === "manager") return "manager";
  return null;
}

export function listSeedUsernames(): { username: string; userType: UserType }[] {
  return SEED.map(({ username, userType }) => ({ username, userType }));
}

function saveSession(session: AuthUser): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
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
  const webRole = normalizeWebRole(row.userType);
  if (!webRole) {
    throw new Error("Tài khoản này dùng app tablet (worker/checker), không dùng Web Manager");
  }
  const session: AuthUser = {
    userId: row.userId,
    username: row.username,
    userType: webRole,
    permissionTier: row.permissionTier,
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
    const s = JSON.parse(raw) as AuthUser;
    const webRole = normalizeWebRole(s.userType);
    if (!webRole) return s;
    return { ...s, userType: webRole };
  } catch {
    return null;
  }
}

export function requireRole(role: UserType | UserType[]): AuthUser | null {
  const s = getSession();
  if (!s) return null;
  const roles = Array.isArray(role) ? role : [role];
  const normalized = normalizeWebRole(s.userType) || s.userType;
  const expanded = roles.flatMap((r) => {
    if (r === "admin" || r === "ceo") return ["ceo", "admin"] as UserType[];
    if (r === "manager") return ["manager"] as UserType[];
    return [r];
  });
  return expanded.includes(normalized as UserType) || expanded.includes(s.userType) ? s : null;
}

export function isCeo(session: AuthUser | null): boolean {
  return normalizeWebRole(session?.userType || "") === "ceo";
}
