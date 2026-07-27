import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ImagePlus,
  Languages,
  MessageCircle,
  Search,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/i18n/LocaleContext";
import { machineLabel, tabletLabel, translateContent, zoneLabel } from "@/i18n/contentLabels";
import { api, apiUrl, type ApiConversation } from "@/lib/api";
import { getSession } from "@/lib/auth-store";
import type { ChatMessage } from "@/lib/manager-store";
import { ImageAnnotator } from "@/manager/components/ImageAnnotator";
import { ImageLightbox } from "@/manager/components/ImageLightbox";
import { cn } from "@/lib/utils";
import {
  emitTypingStart,
  emitTypingStop,
  getSocket,
  joinIncidentRoom,
  joinManagersRoom,
  leaveIncidentRoom,
  type ChatMessagePayload,
  type TypingPayload,
} from "@/lib/socket";
import { registerWebPush } from "@/lib/web-push";
import type { ChatLang } from "./ChatPanel";

type Props = {
  /** Mo phong chat theo incident (vd. bam tu danh sach su co) */
  focusIncidentId?: string | null;
  onFocusConsumed?: () => void;
  onResolved?: () => void;
};

type PeerTyping = {
  userId: number | null;
  username: string;
  userType: string;
};

type HeadsUp = {
  id: string;
  incidentId: string;
  title: string;
  body: string;
};

/** FAB position: left/top in px (after snap: left is near left or right edge). */
type BubblePos = { left: number; top: number };

const TYPING_IDLE_MS = 1500;
const BUBBLE_STORAGE_KEY = "sf.chatBubble.pos";
const FAB_SIZE = 56;
const FAB_MARGIN = 20;
const DRAG_THRESHOLD_PX = 8;

function defaultBubblePos(): BubblePos {
  if (typeof window === "undefined") return { left: FAB_MARGIN, top: FAB_MARGIN };
  return {
    left: Math.max(FAB_MARGIN, window.innerWidth - FAB_MARGIN - FAB_SIZE),
    top: Math.max(FAB_MARGIN, window.innerHeight - FAB_MARGIN - FAB_SIZE),
  };
}

function loadBubblePos(): BubblePos {
  try {
    const raw = localStorage.getItem(BUBBLE_STORAGE_KEY);
    if (!raw) return defaultBubblePos();
    const p = JSON.parse(raw) as { side?: string; bottom?: number; left?: number; top?: number };
    if (typeof p.left === "number" && typeof p.top === "number") {
      return clampBubblePos({ left: p.left, top: p.top });
    }
    if ((p.side === "left" || p.side === "right") && typeof p.bottom === "number") {
      const left =
        p.side === "left"
          ? FAB_MARGIN
          : Math.max(FAB_MARGIN, window.innerWidth - FAB_MARGIN - FAB_SIZE);
      const top = Math.max(
        FAB_MARGIN,
        window.innerHeight - p.bottom - FAB_SIZE
      );
      return clampBubblePos({ left, top });
    }
  } catch {
    /* ignore */
  }
  return defaultBubblePos();
}

function saveBubblePos(pos: BubblePos) {
  try {
    const side = pos.left + FAB_SIZE / 2 < window.innerWidth / 2 ? "left" : "right";
    const bottom = Math.max(FAB_MARGIN, window.innerHeight - pos.top - FAB_SIZE);
    localStorage.setItem(
      BUBBLE_STORAGE_KEY,
      JSON.stringify({ side, bottom, left: pos.left, top: pos.top })
    );
  } catch {
    /* ignore */
  }
}

function clampBubblePos(pos: BubblePos): BubblePos {
  if (typeof window === "undefined") return pos;
  const maxLeft = Math.max(FAB_MARGIN, window.innerWidth - FAB_MARGIN - FAB_SIZE);
  const maxTop = Math.max(FAB_MARGIN, window.innerHeight - FAB_MARGIN - FAB_SIZE);
  return {
    left: Math.min(maxLeft, Math.max(FAB_MARGIN, pos.left)),
    top: Math.min(maxTop, Math.max(FAB_MARGIN, pos.top)),
  };
}

function snapBubblePos(pos: BubblePos): BubblePos {
  const clamped = clampBubblePos(pos);
  const mid = clamped.left + FAB_SIZE / 2;
  const left =
    mid < window.innerWidth / 2
      ? FAB_MARGIN
      : Math.max(FAB_MARGIN, window.innerWidth - FAB_MARGIN - FAB_SIZE);
  return { left, top: clamped.top };
}

type DockPlacementX = "left" | "right";
type DockPlacementY = "above" | "below";

type DockAnchor = {
  x: DockPlacementX;
  y: DockPlacementY;
  style: {
    top?: number;
    bottom?: number;
    left?: number | "auto";
    right?: number | "auto";
  };
  /** Corner tip toward FAB */
  tipClass: string;
  /** Enter animation matching placement (Radix-style) */
  enterClass: string;
};

/**
 * Neo preview/panel theo trục X/Y + vùng chết mép màn hình.
 * FAB snap trái → mở sang phải; snap phải → mở sang trái.
 * Nửa dưới → mở trên; nửa trên → mở dưới.
 */
function computeDockAnchor(
  pos: BubblePos,
  opts: { gap: number; estWidth: number; estHeight: number }
): DockAnchor {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const cx = pos.left + FAB_SIZE / 2;
  const cy = pos.top + FAB_SIZE / 2;
  const x: DockPlacementX = cx < vw / 2 ? "right" : "left";
  const y: DockPlacementY = cy < vh / 2 ? "below" : "above";
  const { gap, estWidth, estHeight } = opts;

  const style: DockAnchor["style"] = { left: "auto", right: "auto" };

  if (x === "right") {
    const left = pos.left + FAB_SIZE + gap;
    style.left = Math.min(left, Math.max(FAB_MARGIN, vw - FAB_MARGIN - estWidth));
    style.right = "auto";
  } else {
    const right = Math.max(FAB_MARGIN, vw - pos.left + gap);
    const maxRight = Math.max(FAB_MARGIN, vw - FAB_MARGIN - estWidth);
    style.right = Math.min(right, maxRight);
    style.left = "auto";
  }

  if (y === "above") {
    const bottom = Math.max(FAB_MARGIN, vh - pos.top + gap);
    style.bottom = Math.min(bottom, Math.max(FAB_MARGIN, vh - FAB_MARGIN - estHeight));
    style.top = undefined;
  } else {
    const top = pos.top + FAB_SIZE + gap;
    style.top = Math.min(top, Math.max(FAB_MARGIN, vh - FAB_MARGIN - estHeight));
    style.bottom = undefined;
  }

  const tipClass =
    x === "right" && y === "above"
      ? "rounded-bl-md"
      : x === "right" && y === "below"
        ? "rounded-tl-md"
        : x === "left" && y === "above"
          ? "rounded-br-md"
          : "rounded-tr-md";

  const enterClass = [
    y === "above" ? "slide-in-from-bottom-2" : "slide-in-from-top-2",
    x === "right" ? "slide-in-from-left-2" : "slide-in-from-right-2",
  ].join(" ");

  return { x, y, style, tipClass, enterClass };
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1" aria-hidden>
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
    </span>
  );
}

export function ChatBubbleDock({ focusIncidentId, onFocusConsumed, onResolved }: Props) {
  const { t, locale } = useLocale();
  const session = getSession();
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [query, setQuery] = useState("");
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [annotateUrl, setAnnotateUrl] = useState<string | null>(null);
  const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);
  const [sendingImage, setSendingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [langByMsg, setLangByMsg] = useState<Record<string, ChatLang>>({});
  const [loadingList, setLoadingList] = useState(false);
  const [peerTyping, setPeerTyping] = useState<PeerTyping | null>(null);
  const [headsUp, setHeadsUp] = useState<HeadsUp | null>(null);
  const [socketOk, setSocketOk] = useState(false);
  const [bubblePos, setBubblePos] = useState<BubblePos>(() =>
    typeof window !== "undefined" ? loadBubblePos() : { left: FAB_MARGIN, top: FAB_MARGIN }
  );
  const [dragging, setDragging] = useState(false);
  const typingIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActiveRef = useRef(false);
  const activeIncidentRef = useRef<string | null>(null);
  const openRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origLeft: number;
    origTop: number;
    moved: boolean;
  } | null>(null);
  activeIncidentRef.current = activeIncidentId;
  openRef.current = open;

  const previewAnchor = useMemo(() => {
    if (typeof window === "undefined") {
      return computeDockAnchor(bubblePos, { gap: 12, estWidth: 320, estHeight: 120 });
    }
    const estWidth = Math.min(320, window.innerWidth - FAB_MARGIN * 2 - FAB_SIZE - 12);
    return computeDockAnchor(bubblePos, { gap: 12, estWidth, estHeight: 120 });
  }, [bubblePos]);

  const panelAnchor = useMemo(() => {
    if (typeof window === "undefined") {
      return computeDockAnchor(bubblePos, { gap: 16, estWidth: 420, estHeight: 640 });
    }
    const estWidth = Math.min(420, window.innerWidth - FAB_MARGIN * 2);
    const estHeight = Math.min(640, window.innerHeight - FAB_MARGIN * 2 - FAB_SIZE - 16);
    return computeDockAnchor(bubblePos, { gap: 16, estWidth, estHeight });
  }, [bubblePos]);

  const panelStyle = panelAnchor.style;
  const previewStyle = previewAnchor.style;

  useEffect(() => {
    const onResize = () => setBubblePos((p) => snapBubblePos(p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onFabPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origLeft: bubblePos.left,
      origTop: bubblePos.top,
      moved: false,
    };
  };

  const onFabPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    d.moved = true;
    setDragging(true);
    setBubblePos(
      clampBubblePos({
        left: d.origLeft + dx,
        top: d.origTop + dy,
      })
    );
  };

  const endFabDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    dragRef.current = null;
    if (d.moved) {
      setBubblePos((p) => {
        const next = snapBubblePos(p);
        saveBubblePos(next);
        return next;
      });
      setDragging(false);
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setDragging(false);
    setOpen((v) => !v);
  };

  const typingMeta = useMemo(
    () => ({
      userId: session?.userId ?? null,
      username: session?.username || "",
      userType: session?.userType || "admin",
    }),
    [session?.userId, session?.username, session?.userType]
  );

  const stopTyping = useCallback(
    (incidentId: string | null) => {
      if (typingIdleRef.current) {
        clearTimeout(typingIdleRef.current);
        typingIdleRef.current = null;
      }
      if (!incidentId || !typingActiveRef.current) {
        typingActiveRef.current = false;
        return;
      }
      typingActiveRef.current = false;
      emitTypingStop(incidentId, typingMeta);
    },
    [typingMeta]
  );

  const signalTyping = useCallback(
    (incidentId: string) => {
      typingActiveRef.current = true;
      emitTypingStart(incidentId, typingMeta);
      if (typingIdleRef.current) clearTimeout(typingIdleRef.current);
      typingIdleRef.current = setTimeout(() => {
        stopTyping(incidentId);
      }, TYPING_IDLE_MS);
    },
    [stopTyping, typingMeta]
  );

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const rows = await api.managerConversations(session?.userId);
      setConversations(rows);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : t("toast.loadFail"));
    } finally {
      setLoadingList(false);
    }
  }, [t, session?.userId]);

  const loadMessages = useCallback(async (incidentId: string) => {
    try {
      const rows = await api.managerMessages(incidentId);
      setMessages(
        rows.map((m) => ({
          id: String(m.id),
          text: m.text,
          sender: m.sender,
          senderName: m.senderName,
          createdAt: m.createdAt || new Date().toISOString(),
          sourceLang: m.sourceLang,
          translations: m.translations || {},
          messageType: m.messageType || "text",
          mediaUrl: m.mediaUrl || null,
        }))
      );
    } catch (err) {
      console.error(err);
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    void registerWebPush();
    const sock = getSocket();
    /** Sau mỗi connect/reconnect phải join lại — Socket.IO xóa room khi disconnect. */
    const onConnect = () => {
      setSocketOk(true);
      joinManagersRoom();
    };
    const onDisconnect = () => setSocketOk(false);
    if (sock.connected) {
      setSocketOk(true);
      joinManagersRoom();
    }
    sock.on("connect", onConnect);
    sock.on("disconnect", onDisconnect);

    const onMessageNew = (payload: ChatMessagePayload) => {
      const incidentId = String(payload.incidentId || "");
      if (!incidentId || !payload.message) return;

      // Chỉ gắn vào thread khi panel đang mở đúng phòng đó
      const viewingThread =
        openRef.current && activeIncidentRef.current === incidentId;
      if (viewingThread) {
        setMessages((prev) => {
          if (prev.some((m) => String(m.id) === String(payload.message!.id))) return prev;
          return [
            ...prev,
            {
              id: String(payload.message!.id),
              text: payload.message!.text,
              sender: payload.message!.sender as ChatMessage["sender"],
              senderName: payload.message!.senderName,
              createdAt: payload.message!.createdAt || new Date().toISOString(),
              sourceLang: payload.message!.sourceLang as ChatMessage["sourceLang"],
              translations: payload.message!.translations || {},
              messageType: payload.message!.messageType || "text",
              mediaUrl: payload.message!.mediaUrl || null,
            },
          ];
        });
        if (session?.userId) {
          void api.markChatRead(session.userId, incidentId).then(() => void loadConversations());
        } else {
          void loadConversations();
        }
        return;
      }

      const fromSelf =
        !!session?.username &&
        payload.message.senderName === session.username &&
        (payload.message.sender === "admin" ||
          payload.message.sender === session.userType);

      // Tin của chính mình: chỉ refresh list, không hiện preview / tăng unread
      if (fromSelf) {
        void loadConversations();
        return;
      }

      // Tăng unread ngay trên list (trước khi reload)
      setConversations((prev) =>
        prev.map((c) =>
          String(c.incidentId) === incidentId
            ? { ...c, unreadCount: (c.unreadCount || 0) + 1 }
            : c
        )
      );

      // Preview nội dung tin nhắn vài giây (kiểu Messenger) — không chỉ badge số
      setHeadsUp({
        id: `${payload.message.id}-${Date.now()}`,
        incidentId,
        title: payload.preview?.senderName || payload.message.senderName || "Chat",
        body: payload.preview?.lastMessage || payload.message.text,
      });
      void loadConversations();
    };

    const onConversationUpdated = () => {
      void loadConversations();
    };

    const onResolved = (payload: ChatMessagePayload) => {
      void loadConversations();
      if (activeIncidentRef.current === String(payload.incidentId)) {
        void loadMessages(String(payload.incidentId));
      }
    };

    sock.on("message:new", onMessageNew);
    sock.on("conversation:updated", onConversationUpdated);
    sock.on("incident:resolved", onResolved);
    return () => {
      sock.off("connect", onConnect);
      sock.off("disconnect", onDisconnect);
      sock.off("message:new", onMessageNew);
      sock.off("conversation:updated", onConversationUpdated);
      sock.off("incident:resolved", onResolved);
    };
  }, [loadConversations, loadMessages, session?.userId, session?.username, session?.userType]);

  useEffect(() => {
    if (!headsUp) return;
    const id = window.setTimeout(() => setHeadsUp(null), 5000);
    return () => window.clearTimeout(id);
  }, [headsUp]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    void loadConversations();
    if (socketOk) return;
    const id = window.setInterval(() => void loadConversations(), 8000);
    return () => window.clearInterval(id);
  }, [open, loadConversations, socketOk]);

  useEffect(() => {
    if (!focusIncidentId) return;
    setOpen(true);
    setActiveIncidentId(focusIncidentId);
    onFocusConsumed?.();
  }, [focusIncidentId, onFocusConsumed]);

  useEffect(() => {
    if (!open || !activeIncidentId) {
      setMessages([]);
      setPeerTyping(null);
      return;
    }
    void loadMessages(activeIncidentId);
    joinIncidentRoom(activeIncidentId, typingMeta);

    // Đánh dấu đã đọc → badge unread giảm realtime
    if (session?.userId) {
      void api
        .markChatRead(session.userId, activeIncidentId)
        .then(() => void loadConversations())
        .catch(() => undefined);
    }

    const sock = getSocket();
    const onTyping = (payload: TypingPayload) => {
      if (String(payload.incidentId) !== String(activeIncidentId)) return;
      if (payload.userId != null && session?.userId != null && payload.userId === session.userId) {
        return;
      }
      if (payload.isTyping) {
        setPeerTyping({
          userId: payload.userId,
          username: payload.username || "",
          userType: payload.userType || "",
        });
      } else {
        setPeerTyping((prev) => {
          if (!prev) return null;
          if (payload.userId != null && prev.userId != null && payload.userId !== prev.userId) {
            return prev;
          }
          return null;
        });
      }
    };
    sock.on("typing", onTyping);

    const pollId =
      socketOk || sock.connected
        ? null
        : window.setInterval(() => void loadMessages(activeIncidentId), 5000);
    return () => {
      if (pollId) window.clearInterval(pollId);
      sock.off("typing", onTyping);
      stopTyping(activeIncidentId);
      leaveIncidentRoom(activeIncidentId, typingMeta);
      setPeerTyping(null);
    };
  }, [
    open,
    activeIncidentId,
    loadMessages,
    loadConversations,
    session?.userId,
    stopTyping,
    typingMeta,
    socketOk,
  ]);

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [conversations]
  );

  const openCount = useMemo(
    () =>
      conversations.filter(
        (c) => c.isOpen === true || (c.isActive && c.incidentStatus !== "resolved")
      ).length,
    [conversations]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const hay = [
        c.displayName,
        c.tabletUsername,
        c.checkedBy,
        c.deviceCode,
        c.deviceName,
        c.zoneCode,
        c.zoneName,
        c.reason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [conversations, query]);

  const active = useMemo(
    () => conversations.find((c) => c.incidentId === activeIncidentId) || null,
    [conversations, activeIncidentId]
  );

  const chatLocked = active?.incidentStatus === "resolved" || active?.isActive === false;

  useEffect(() => {
    if (chatLocked) {
      stopTyping(activeIncidentId);
      setPeerTyping(null);
    }
  }, [chatLocked, activeIncidentId, stopTyping]);

  const displayText = (msg: ChatMessage) => {
    const id = String(msg.id);
    // Chỉ hiện bản dịch khi user đã chọn ngôn ngữ trên thiết bị này (không auto theo cache server)
    const lang = langByMsg[id];
    if (!lang) return msg.text;
    if (msg.translations?.[lang]) return msg.translations[lang]!;
    const local = translateContent(msg.text, lang);
    if (local !== msg.text) return local;
    return msg.text;
  };

  const onSend = async () => {
    if (!activeIncidentId || !draft.trim() || chatLocked) return;
    const text = draft.trim();
    setDraft("");
    stopTyping(activeIncidentId);
    try {
      await api.sendManagerMessage(
        activeIncidentId,
        text,
        session?.userId,
        locale as "vi" | "en" | "ko"
      );
      await loadMessages(activeIncidentId);
      await loadConversations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.sendFail"));
      setDraft(text);
    }
  };

  const onPickImage = (file: File | null) => {
    if (!file || chatLocked || !activeIncidentId) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      toast.error("Chỉ chấp nhận JPEG/PNG/WebP");
      return;
    }
    const url = URL.createObjectURL(file);
    setAnnotateUrl(url);
  };

  const closeAnnotator = () => {
    if (annotateUrl?.startsWith("blob:")) URL.revokeObjectURL(annotateUrl);
    setAnnotateUrl(null);
  };

  const onConfirmImage = async (blob: Blob) => {
    if (!activeIncidentId || chatLocked) return;
    closeAnnotator();
    setSendingImage(true);
    try {
      const { mediaUrl } = await api.uploadChatImage(blob, "chat.jpg");
      await api.sendManagerMessage(
        activeIncidentId,
        "[ảnh]",
        session?.userId,
        locale as "vi" | "en" | "ko",
        { messageType: "image", mediaUrl }
      );
      await loadMessages(activeIncidentId);
      await loadConversations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gửi ảnh thất bại");
    } finally {
      setSendingImage(false);
    }
  };

  const onDraftChange = (value: string) => {
    setDraft(value);
    if (!activeIncidentId || chatLocked) return;
    if (!value.trim()) {
      stopTyping(activeIncidentId);
      return;
    }
    signalTyping(activeIncidentId);
  };

  const onTranslate = async (msg: ChatMessage, lang: ChatLang) => {
    const messageId = String(msg.id);
    setLangByMsg((prev) => ({ ...prev, [messageId]: lang }));
    if (msg.translations?.[lang]) return;
    setTranslatingId(messageId);
    try {
      const result = await api.translateMessage(messageId, lang);
      const translated = result.translatedText || result.translations?.[lang];
      if (!translated) throw new Error(t("toast.translateFail"));
      setMessages((prev) =>
        prev.map((m) =>
          String(m.id) === messageId
            ? {
                ...m,
                translations: {
                  ...(m.translations || {}),
                  ...(result.translations || {}),
                  [lang]: translated,
                },
              }
            : m
        )
      );
    } catch {
      const local =
        translateContent(msg.text, lang) !== msg.text
          ? translateContent(msg.text, lang)
          : lang === "en"
            ? `[EN] ${msg.text}`
            : lang === "ko"
              ? `[KO] ${msg.text}`
              : `[VI] ${msg.text}`;
      setMessages((prev) =>
        prev.map((m) =>
          String(m.id) === messageId
            ? { ...m, translations: { ...(m.translations || {}), [lang]: local } }
            : m
        )
      );
    } finally {
      setTranslatingId(null);
    }
  };

  const onResolve = async () => {
    if (!activeIncidentId || chatLocked) return;
    try {
      await api.resolveIncident(activeIncidentId);
      toast.success(t("toast.resolved"));
      await loadConversations();
      await loadMessages(activeIncidentId);
      onResolved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.resolveFail"));
    }
  };

  const timeLocale = locale === "ko" ? "ko-KR" : locale === "en" ? "en-US" : "vi-VN";

  return (
    <>
      {/* Preview tin nhắn nổi cạnh FAB ~5s — neo X/Y theo vị trí bóng */}
      {headsUp && !open && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setActiveIncidentId(headsUp.incidentId);
            setHeadsUp(null);
          }}
          className={cn(
            "fixed z-50 w-[min(320px,calc(100vw-5.5rem))]",
            "rounded-xl border border-border bg-card text-foreground",
            previewAnchor.tipClass,
            "shadow-elevated px-3.5 py-3 text-left",
            "animate-in fade-in duration-200",
            previewAnchor.enterClass
          )}
          style={previewStyle}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wide text-primary mb-0.5">
            {t("chat.newMessage")}
          </div>
          <div className="font-semibold text-sm truncate">{headsUp.title}</div>
          <div className="text-sm text-foreground/90 line-clamp-3 mt-1 leading-snug whitespace-pre-wrap">
            {headsUp.body}
          </div>
        </button>
      )}
      {headsUp && open && (
        <button
          type="button"
          onClick={() => {
            setActiveIncidentId(headsUp.incidentId);
            setHeadsUp(null);
          }}
          className={cn(
            "fixed z-50 top-4 left-1/2 -translate-x-1/2 w-[min(420px,calc(100vw-1.5rem))]",
            "rounded-xl bg-primary text-primary-foreground shadow-elevated px-4 py-3 text-left"
          )}
        >
          <div className="text-[10px] font-semibold uppercase opacity-80 mb-0.5">
            {t("chat.newMessage")}
          </div>
          <div className="font-semibold text-sm truncate">{headsUp.title}</div>
          <div className="text-sm opacity-95 line-clamp-3 mt-1 whitespace-pre-wrap">{headsUp.body}</div>
        </button>
      )}

      {/* Bubble — kéo được, snap trái/phải */}
      <button
        type="button"
        onPointerDown={onFabPointerDown}
        onPointerMove={onFabPointerMove}
        onPointerUp={endFabDrag}
        onPointerCancel={endFabDrag}
        className={cn(
          "fixed z-40 h-touch w-touch rounded-xl shadow-fab touch-none select-none",
          "bg-primary text-primary-foreground flex items-center justify-center",
          !dragging && "cursor-pointer hover:bg-primary-glow active:scale-95 transition-colors",
          dragging && "cursor-grabbing",
          open && "ring-4 ring-primary/30",
          headsUp && !open && "ring-4 ring-destructive/40"
        )}
        style={{ left: bubblePos.left, top: bubblePos.top, right: "auto", bottom: "auto" }}
        aria-label={t("chat.bubble")}
        aria-expanded={open}
      >
        {open ? <X className="h-6 w-6 pointer-events-none" /> : <MessageCircle className="h-6 w-6 pointer-events-none" />}
        {!open && (headsUp || unreadTotal > 0) && (
          <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center pointer-events-none">
            {headsUp && unreadTotal === 0
              ? "!"
              : unreadTotal > 99
                ? "99+"
                : unreadTotal}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className={cn(
            "fixed z-40 w-[min(420px,calc(100vw-1.5rem))] h-[min(640px,calc(100vh-7rem))]",
            "rounded-xl border-2 border-border bg-card shadow-elevated flex flex-col overflow-hidden"
          )}
          style={panelStyle}
        >
          <header className="flex-shrink-0 px-3 py-2.5 border-b border-border bg-primary text-primary-foreground flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-bold text-sm truncate">
                {active
                  ? `${tabletLabel(active.tabletUsername || active.displayName)} · ${active.deviceCode}`
                  : t("chat.bubbleTitle")}
              </div>
              <div className="text-[11px] opacity-80 truncate">
                {active
                  ? [
                      machineLabel(active.deviceCode, locale, active.deviceName),
                      active.checkedBy
                        ? t("chat.checkedBy", { name: active.checkedBy })
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : unreadTotal > 0
                    ? `${t("chat.unreadCount", { n: unreadTotal })} · ${t("chat.openCount", { n: openCount })}`
                    : t("chat.openCount", { n: openCount })}
              </div>
            </div>
            <button
              type="button"
              className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60"
              onClick={() => setOpen(false)}
              aria-label={t("chat.close")}
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          {!activeIncidentId ? (
            <>
              <div className="flex-shrink-0 p-2 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("chat.searchPlaceholder")}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1.5">
                  {loadingList && conversations.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">{t("ui.loading")}</p>
                  )}
                  {!loadingList && conversations.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      {t("chat.noConversations")}
                    </p>
                  )}
                  {conversations.length > 0 && filtered.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      {t("chat.noSearchHit")}
                    </p>
                  )}
                  {filtered.map((c) => {
                    const openRoom =
                      c.isOpen === true || (c.isActive && c.incidentStatus !== "resolved");
                    const activityAt = c.lastActivityAt || c.lastMessageAt;
                    const unread = c.unreadCount || 0;
                    return (
                      <button
                        key={c.conversationId}
                        type="button"
                        onClick={() => setActiveIncidentId(c.incidentId)}
                        className={cn(
                          "w-full text-left rounded-xl border bg-background hover:border-primary/50 p-3 transition-colors",
                          unread > 0 ? "border-primary/40" : "border-border"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="font-semibold text-sm text-foreground truncate">
                            {tabletLabel(c.tabletUsername || c.displayName)}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {unread > 0 && (
                              <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                                {unread > 99 ? "99+" : unread}
                              </span>
                            )}
                            <span
                              className={cn(
                                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full border",
                                openRoom
                                  ? "bg-primary/10 text-primary border-primary/30"
                                  : "bg-muted text-muted-foreground border-border"
                              )}
                            >
                              {t(`status.${c.incidentStatus}`)}
                            </span>
                          </div>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {c.deviceCode} · {zoneLabel(c.zoneCode, locale, c.zoneName)}
                        </div>
                        <div
                          className={cn(
                            "text-xs line-clamp-1 mt-1",
                            unread > 0 ? "font-semibold text-foreground" : "text-foreground/80"
                          )}
                        >
                          {c.lastMessage || t("chat.lastMessageEmpty")}
                        </div>
                        {activityAt && (
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {new Date(activityAt).toLocaleString(timeLocale, {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          ) : (
            <>
              <div className="flex-shrink-0 px-2 py-1.5 border-b border-border flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    stopTyping(activeIncidentId);
                    setActiveIncidentId(null);
                    setDraft("");
                    setLangByMsg({});
                    setPeerTyping(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary px-2 py-1 rounded-md"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t("chat.backToList")}
                </button>
                <div className="flex-1" />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={chatLocked}
                  onClick={() => void onResolve()}
                  className="h-7 text-xs"
                >
                  {t("chat.resolve")}
                </Button>
              </div>

              <ScrollArea className="flex-1 px-3 py-2">
                <div className="space-y-2.5">
                  {messages.map((msg) => {
                    const id = String(msg.id);
                    const activeLang = langByMsg[id];
                    const busy = translatingId === id;
                    const isMine =
                      msg.sender === "admin" ||
                      msg.sender === "ceo" ||
                      msg.sender === "manager";
                    const isImage =
                      msg.messageType === "image" && Boolean(msg.mediaUrl);
                    const mediaSrc = msg.mediaUrl
                      ? msg.mediaUrl.startsWith("http")
                        ? msg.mediaUrl
                        : apiUrl(msg.mediaUrl)
                      : null;
                    return (
                      <div
                        key={id}
                        className={cn(
                          "flex flex-col",
                          isMine ? "items-end" : "items-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[90%] rounded-xl px-3 py-2 text-sm shadow-card",
                            msg.sender === "system"
                              ? "bg-muted text-muted-foreground italic w-full text-center"
                              : isMine
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted/60 border border-border text-foreground rounded-bl-md"
                          )}
                        >
                          {msg.sender !== "system" && (
                            <div className="text-[10px] font-semibold opacity-70 mb-0.5">
                              {msg.senderName}
                            </div>
                          )}
                          {isImage && mediaSrc ? (
                            <button
                              type="button"
                              className="block w-full text-left cursor-zoom-in"
                              onClick={() => setViewImageUrl(mediaSrc)}
                              aria-label="Xem ảnh lớn"
                            >
                              <img
                                src={mediaSrc}
                                alt="Ảnh chat"
                                className="max-h-52 w-full rounded-lg object-cover"
                              />
                            </button>
                          ) : (
                            <div className="whitespace-pre-wrap leading-relaxed">
                              {displayText(msg)}
                            </div>
                          )}
                        </div>
                        {msg.sender !== "system" && !isImage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                disabled={busy}
                                className="mt-0.5 text-[10px] text-muted-foreground hover:text-primary inline-flex items-center gap-1 px-1"
                              >
                                <Languages className="h-3 w-3" />
                                {busy
                                  ? t("chat.translating")
                                  : activeLang
                                    ? `${t("chat.translate")} · ${activeLang.toUpperCase()}`
                                    : t("chat.translate")}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isMine ? "end" : "start"}>
                              {(["vi", "en", "ko"] as ChatLang[]).map((lang) => (
                                <DropdownMenuItem
                                  key={lang}
                                  onSelect={() => void onTranslate(msg, lang)}
                                  className="gap-2 text-xs"
                                >
                                  <span className="font-mono uppercase w-6">{lang}</span>
                                  {lang === "vi"
                                    ? t("chat.langVi")
                                    : lang === "en"
                                      ? t("chat.langEn")
                                      : t("chat.langKo")}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    );
                  })}

                  {!chatLocked && peerTyping && (
                    <div className="flex flex-col items-start">
                      <div className="max-w-[90%] rounded-xl rounded-bl-md px-3 py-2 text-sm shadow-card bg-muted/60 border border-border text-muted-foreground">
                        <div className="text-[10px] font-semibold opacity-70 mb-0.5">
                          {peerTyping.username || peerTyping.userType || "…"}
                        </div>
                        <div className="inline-flex items-center text-xs italic">
                          {t("chat.typing")}
                          <TypingDots />
                        </div>
                      </div>
                    </div>
                  )}

                  {chatLocked && (
                    <div className="text-center text-[11px] font-medium text-success py-2">
                      {t("chat.locked")}
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="flex-shrink-0 border-t border-border p-2">
                <div className="flex gap-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      e.target.value = "";
                      onPickImage(file);
                    }}
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={chatLocked || sendingImage || !activeIncidentId}
                    aria-label="Gửi ảnh"
                  >
                    <ImagePlus className="h-4 w-4" />
                  </Button>
                  <input
                    value={draft}
                    onChange={(e) => onDraftChange(e.target.value)}
                    onBlur={() => stopTyping(activeIncidentId)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void onSend()}
                    disabled={chatLocked}
                    placeholder={
                      chatLocked ? t("chat.lockedPlaceholder") : t("chat.placeholder")
                    }
                    className="flex-1 px-2.5 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                  />
                  <Button
                    size="icon"
                    onClick={() => void onSend()}
                    disabled={chatLocked || !draft.trim()}
                    aria-label={t("chat.send")}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      {viewImageUrl && !annotateUrl && (
        <ImageLightbox
          src={viewImageUrl}
          onClose={() => setViewImageUrl(null)}
          editDisabled={chatLocked || sendingImage || !activeIncidentId}
          onEdit={
            chatLocked || !activeIncidentId
              ? undefined
              : () => {
                  setAnnotateUrl(viewImageUrl);
                  setViewImageUrl(null);
                }
          }
        />
      )}
      {annotateUrl && (
        <ImageAnnotator
          sourceUrl={annotateUrl}
          onCancel={closeAnnotator}
          onConfirm={(blob) => void onConfirmImage(blob)}
        />
      )}
    </>
  );
}
