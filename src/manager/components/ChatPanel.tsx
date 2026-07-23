import { useState } from "react";
import { Languages, MessageSquare, Send, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/i18n/LocaleContext";
import { machineLabel, translateContent } from "@/i18n/contentLabels";
import type { ChatMessage, TaskIncidentView } from "@/lib/manager-store";

export type ChatLang = "vi" | "en" | "ko";

type Props = {
  selected: TaskIncidentView | null;
  messages: ChatMessage[];
  draft: string;
  chatLocked: boolean;
  translatingId?: string | null;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onTranslate: (msg: ChatMessage, lang: ChatLang) => void | Promise<string | void>;
  onResolve: () => void;
};

export function ChatPanel({
  selected,
  messages,
  draft,
  chatLocked,
  translatingId,
  onDraftChange,
  onSend,
  onTranslate,
  onResolve,
}: Props) {
  const { t, locale } = useLocale();
  const [langByMsg, setLangByMsg] = useState<Record<string, ChatLang>>({});

  const displayText = (msg: ChatMessage) => {
    const id = String(msg.id);
    // Chỉ hiện bản dịch khi user đã chọn ngôn ngữ trên thiết bị này
    const lang = langByMsg[id];
    if (!lang) return msg.text;
    const cached = msg.translations?.[lang];
    if (cached) return cached;
    const local = translateContent(msg.text, lang);
    return local !== msg.text ? local : msg.text;
  };
  const pickLang = async (msg: ChatMessage, lang: ChatLang) => {
    const id = String(msg.id);
    setLangByMsg((prev) => ({ ...prev, [id]: lang }));
    if (msg.translations?.[lang]) return;
    await onTranslate(msg, lang);
  };

  return (
    <section className="flex flex-col min-h-0 bg-muted/20">
      <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-card flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            {t("chat.title")}
          </h2>
          <div className="text-xs text-muted-foreground truncate">
            {selected
              ? `${selected.deviceCode} · ${machineLabel(selected.deviceCode, locale, selected.deviceName)}`
              : t("chat.pickIncident")}
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={!selected || chatLocked}
          onClick={onResolve}
          className="gap-1.5"
        >
          <Wrench className="h-3.5 w-3.5" />
          {t("chat.resolve")}
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-3 max-w-3xl mx-auto">
          {!selected && (
            <p className="text-sm text-muted-foreground text-center py-12">{t("chat.empty")}</p>
          )}
          {messages.map((msg) => {
            const activeLang = langByMsg[String(msg.id)];
            const busy = translatingId === String(msg.id);
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "admin" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-card ${
                    msg.sender === "system"
                      ? "bg-muted text-muted-foreground italic w-full text-center"
                      : msg.sender === "admin"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-card border border-border text-foreground rounded-bl-md"
                  }`}
                >
                  {msg.sender !== "system" && (
                    <div className="text-[10px] font-semibold opacity-70 mb-0.5">{msg.senderName}</div>
                  )}
                  <div className="whitespace-pre-wrap leading-relaxed">{displayText(msg)}</div>
                  {msg.sender !== "system" && activeLang && (
                    <div className="mt-1.5 text-[10px] opacity-70 uppercase tracking-wide">
                      {activeLang}
                    </div>
                  )}
                </div>

                {msg.sender !== "system" && (
                  <div className="mt-1 px-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          disabled={busy}
                          className="text-[11px] text-muted-foreground hover:text-primary inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-muted/80 disabled:opacity-50"
                        >
                          <Languages className="h-3 w-3" />
                          {busy
                            ? t("chat.translating")
                            : activeLang
                              ? `${t("chat.translate")} · ${activeLang.toUpperCase()}`
                              : t("chat.translate")}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align={msg.sender === "admin" ? "end" : "start"}
                        className="min-w-[10rem]"
                      >
                        {(["vi", "en", "ko"] as ChatLang[]).map((lang) => (
                          <DropdownMenuItem
                            key={lang}
                            onSelect={() => void pickLang(msg, lang)}
                            className="gap-2"
                          >
                            <span className="font-mono text-xs uppercase w-6">{lang}</span>
                            <span>
                              {lang === "vi"
                                ? t("chat.langVi")
                                : lang === "en"
                                  ? t("chat.langEn")
                                  : t("chat.langKo")}
                            </span>
                            {activeLang === lang && (
                              <span className="ml-auto text-primary text-[10px]">●</span>
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            );
          })}
          {chatLocked && (
            <div className="text-center text-xs font-medium text-success py-2">{t("chat.locked")}</div>
          )}
        </div>
      </ScrollArea>

      <div className="flex-shrink-0 border-t border-border bg-card p-3">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSend()}
            disabled={!selected || chatLocked}
            placeholder={chatLocked ? t("chat.lockedPlaceholder") : t("chat.placeholder")}
            className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
          />
          <Button onClick={onSend} disabled={!selected || chatLocked || !draft.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
