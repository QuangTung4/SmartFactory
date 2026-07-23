import { io, type Socket } from "socket.io-client";

export type TypingPayload = {
  incidentId: string;
  userId: number | null;
  username: string;
  userType: string;
  isTyping: boolean;
};

let socket: Socket | null = null;

/** Dev: same origin → Vite proxies /socket.io. Prod/LAN with VITE_API_URL: connect to API host. */
function socketUrl(): string | undefined {
  const api = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
  if (api) return api;
  return undefined;
}

export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(socketUrl(), {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    autoConnect: true,
  });
  return socket;
}

export function joinIncidentRoom(
  incidentId: string,
  meta: { userId?: number | null; username?: string; userType?: string }
) {
  getSocket().emit("join", {
    incidentId: String(incidentId),
    userId: meta.userId ?? null,
    username: meta.username || "",
    userType: meta.userType || "",
  });
}

export function leaveIncidentRoom(
  incidentId: string,
  meta: { userId?: number | null }
) {
  getSocket().emit("leave", {
    incidentId: String(incidentId),
    userId: meta.userId ?? null,
  });
}

export function emitTypingStart(
  incidentId: string,
  meta: { userId?: number | null; username?: string; userType?: string }
) {
  getSocket().emit("typing:start", {
    incidentId: String(incidentId),
    userId: meta.userId ?? null,
    username: meta.username || "",
    userType: meta.userType || "",
  });
}

export function emitTypingStop(
  incidentId: string,
  meta: { userId?: number | null; username?: string; userType?: string }
) {
  getSocket().emit("typing:stop", {
    incidentId: String(incidentId),
    userId: meta.userId ?? null,
    username: meta.username || "",
    userType: meta.userType || "",
  });
}
