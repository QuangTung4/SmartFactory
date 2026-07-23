import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
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
import { api, type ApiConversation } from "@/lib/api";
import { getSession } from "@/lib/auth-store";
import type { ChatMessage } from "@/lib/manager-store";
import {
  emitTypingStart,
  emitTypingStop,
  getSocket,
  joinIncidentRoom,
  leaveIncidentRoom,
  type TypingPayload,
} from "@/lib/socket";
import type { ChatLang } from "./ChatPanel";
import { cn } from "@/lib/utils";

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

const TYPING_IDLE_MS = 1500;

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
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [langByMsg, setLangByMsg] = useState<Record<string, ChatLang>>({});
  const [loadingList, setLoadingList] = useState(false);
  const [peerTyping, setPeerTyping] = useState<PeerTyping | null>(null);
  const typingIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActiveRef = useRef(false);

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
      const rows = await api.managerConversations();
      setConversations(rows);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : t("toast.loadFail"));
    } finally {
      setLoadingList(false);
    }
  }, [t]);

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
        }))
      );
    } catch (err) {
      console.error(err);
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadConversations();
    const id = window.setInterval(() => void loadConversations(), 8000);
    return () => window.clearInterval(id);
  }, [open, loadConversations]);

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

    const id = window.setInterval(() => void loadMessages(activeIncidentId), 5000);
    return () => {
      window.clearInterval(id);
      sock.off("typing", onTyping);
      stopTyping(activeIncidentId);
      leaveIncidentRoom(activeIncidentId, typingMeta);
      setPeerTyping(null);
    };
  }, [open, activeIncidentId, loadMessages, session?.userId, stopTyping, typingMeta]);

  const openCount = useMemo(
    () =>
      conversations.filter((c) => c.isActive && c.incidentStatus !== "resolved").length,
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
      {/* Bubble */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed z-40 bottom-5 right-5 h-14 w-14 rounded-full shadow-elevated",
          "bg-primary text-primary-foreground flex items-center justify-center",
          "hover:scale-105 active:scale-95 transition-transform",
          open && "ring-4 ring-primary/30"
        )}
        aria-label={t("chat.bubble")}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && openCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {openCount > 99 ? "99+" : openCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className={cn(
            "fixed z-40 bottom-24 right-5 w-[min(420px,calc(100vw-1.5rem))] h-[min(640px,calc(100vh-7rem))]",
            "rounded-2xl border-2 border-border bg-card shadow-elevated flex flex-col overflow-hidden"
          )}
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
                      active.checkedBy ? `KT: ${active.checkedBy}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : t("chat.openCount", { n: openCount })}
              </div>
            </div>
            <button
              type="button"
              className="p-1.5 rounded-lg hover:bg-white/15"
              onClick={() => setOpen(false)}
              aria-label="Close"
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
                    const openRoom = c.isActive && c.incidentStatus !== "resolved";
                    return (
                      <button
                        key={c.conversationId}
                        type="button"
                        onClick={() => setActiveIncidentId(c.incidentId)}
                        className="w-full text-left rounded-xl border border-border bg-background hover:border-primary/50 p-3 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="font-semibold text-sm text-foreground truncate">
                            {tabletLabel(c.tabletUsername || c.displayName)}
                          </div>
                          <span
                            className={cn(
                              "text-[10px] font-semibold px-1.5 py-0.5 rounded-full border flex-shrink-0",
                              openRoom
                                ? "bg-primary/10 text-primary border-primary/30"
                                : "bg-muted text-muted-foreground border-border"
                            )}
                          >
                            {t(`status.${c.incidentStatus}`)}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {c.deviceCode} · {zoneLabel(c.zoneCode, locale, c.zoneName)}
                        </div>
                        <div className="text-xs text-foreground/80 line-clamp-1 mt-1">
                          {c.lastMessage || t("chat.lastMessageEmpty")}
                        </div>
                        {c.lastMessageAt && (
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {new Date(c.lastMessageAt).toLocaleString(timeLocale, {
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
                    return (
                      <div
                        key={id}
                        className={cn(
                          "flex flex-col",
                          msg.sender === "admin" ? "items-end" : "items-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[90%] rounded-2xl px-3 py-2 text-sm shadow-card",
                            msg.sender === "system"
                              ? "bg-muted text-muted-foreground italic w-full text-center"
                              : msg.sender === "admin"
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted/60 border border-border text-foreground rounded-bl-md"
                          )}
                        >
                          {msg.sender !== "system" && (
                            <div className="text-[10px] font-semibold opacity-70 mb-0.5">
                              {msg.senderName}
                            </div>
                          )}
                          <div className="whitespace-pre-wrap leading-relaxed">
                            {displayText(msg)}
                          </div>
                        </div>
                        {msg.sender !== "system" && (
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
                            <DropdownMenuContent align={msg.sender === "admin" ? "end" : "start"}>
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
                      <div className="max-w-[90%] rounded-2xl rounded-bl-md px-3 py-2 text-sm shadow-card bg-muted/60 border border-border text-muted-foreground">
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
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
