import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocale } from "@/i18n/LocaleContext";
import { api, type ApiReportDocument } from "@/lib/api";
import { getSession } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { FilterSelect } from "../components/ZoneFilterBar";

type DirFilter = "ALL" | "exported" | "sent" | "received";

export default function ReportLibraryPage() {
  const { t, locale } = useLocale();
  const session = getSession();
  const [rows, setRows] = useState<ApiReportDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [dirFilter, setDirFilter] = useState<DirFilter>("ALL");

  const load = useCallback(async () => {
    if (!session?.userId) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.reportDocuments(session.userId);
      setRows(data);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : t("toast.loadFail"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [session?.userId, t]);

  const openDocument = useCallback(
    async (doc: ApiReportDocument) => {
      if (!session?.userId) return;
      setOpeningId(doc.documentId);
      try {
        const res = await fetch(api.reportDocumentFileUrl(doc.documentId, session.userId));
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        const blob = await res.blob();
        const type = blob.type || "application/pdf";
        if (!type.includes("pdf") && blob.size < 100) {
          throw new Error(t("library.openFail"));
        }
        // Validate PDF magic header — reject broken/test stubs early.
        const head = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
        const magic = String.fromCharCode(...head);
        if (!magic.startsWith("%PDF")) {
          throw new Error(t("library.openInvalid"));
        }
        const pdfBlob = blob.type.includes("pdf")
          ? blob
          : new Blob([blob], { type: "application/pdf" });
        const url = URL.createObjectURL(pdfBlob);
        const win = window.open(url, "_blank", "noopener,noreferrer");
        if (!win) {
          // Popup blocked — fallback download
          const a = document.createElement("a");
          a.href = url;
          a.download = doc.fileName || "report.pdf";
          a.click();
          toast.message(t("library.downloadFallback"));
        }
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : t("library.openFail"));
      } finally {
        setOpeningId(null);
      }
    },
    [session?.userId, t]
  );

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (dirFilter === "ALL") return rows;
    return rows.filter((r) => r.direction === dirFilter);
  }, [rows, dirFilter]);

  const timeLocale = locale === "ko" ? "ko-KR" : locale === "en" ? "en-US" : "vi-VN";

  const dirLabel = (d: string) => {
    if (d === "exported") return t("library.dirExported");
    if (d === "sent") return t("library.dirSent");
    if (d === "received") return t("library.dirReceived");
    return d;
  };

  const sourceLabel = (s: string) => {
    if (s === "checker_report") return t("library.sourceChecker");
    if (s === "manager_report") return t("library.sourceManager");
    return s;
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-shrink-0 px-4 py-3 border-b border-border flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-primary flex-shrink-0" />
          <h1 className="font-semibold text-sm md:text-base truncate">{t("library.title")}</h1>
        </div>
        <FilterSelect
          label={t("library.filterDirection")}
          value={dirFilter}
          size="sm"
          onChange={(v) => setDirFilter(v as DirFilter)}
          options={[
            { value: "ALL", label: t("library.filterAll") },
            { value: "exported", label: t("library.dirExported") },
            { value: "sent", label: t("library.dirSent") },
            { value: "received", label: t("library.dirReceived") },
          ]}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 ml-auto"
          onClick={() => {
            setLoading(true);
            void load();
          }}
        >
          {t("library.refresh")}
        </Button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("ui.loading")}
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {visible.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">{t("library.empty")}</p>
            ) : (
              visible.map((doc) => (
                <div
                  key={doc.documentId}
                  className="rounded-xl border border-border bg-card p-3 flex flex-wrap items-center gap-3 shadow-card"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="font-medium text-sm truncate">{doc.fileName}</div>
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded-full border font-semibold",
                          doc.direction === "received"
                            ? "bg-primary/10 text-primary border-primary/30"
                            : doc.direction === "sent"
                              ? "bg-success/10 text-success border-success/30"
                              : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {dirLabel(doc.direction)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">
                        {sourceLabel(doc.source)}
                      </span>
                      {doc.periodLabel && (
                        <span className="px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">
                          {doc.periodLabel}
                        </span>
                      )}
                      {doc.shiftCode && (
                        <span className="px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">
                          {doc.shiftCode}
                        </span>
                      )}
                      {doc.zoneCodes && (
                        <span className="px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">
                          {doc.zoneCodes}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {doc.createdAt
                        ? new Date(doc.createdAt).toLocaleString(timeLocale)
                        : "—"}
                      {doc.byteSize
                        ? ` · ${Math.max(1, Math.round(doc.byteSize / 1024))} KB`
                        : ""}
                      {doc.fromUserType
                        ? ` · ${doc.fromUserType}${doc.toUserType ? ` → ${doc.toUserType}` : ""}`
                        : ""}
                    </div>
                  </div>
                  {session?.userId && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8"
                      disabled={openingId === doc.documentId}
                      onClick={() => void openDocument(doc)}
                    >
                      {openingId === doc.documentId ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {t("library.open")}
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
