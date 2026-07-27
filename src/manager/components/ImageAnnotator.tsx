import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Crop, Pencil, Square, Circle, MoveUpRight, Undo2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tool = "draw" | "rect" | "oval" | "arrow" | "crop";

type Stroke =
  | { kind: "draw"; points: { x: number; y: number }[]; color: string; width: number }
  | { kind: "rect" | "oval" | "arrow" | "crop"; x0: number; y0: number; x1: number; y1: number; color: string; width: number };

type Props = {
  sourceUrl: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
};

function fitRect(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): { left: number; top: number; width: number; height: number } {
  const scale = Math.min(dstW / srcW, dstH / srcH);
  const width = srcW * scale;
  const height = srcH * scale;
  return { left: (dstW - width) / 2, top: (dstH - height) / 2, width, height };
}

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (s.kind === "draw") {
    if (s.points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(s.points[0]!.x, s.points[0]!.y);
    for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i]!.x, s.points[i]!.y);
    ctx.stroke();
    return;
  }
  const l = Math.min(s.x0, s.x1);
  const t = Math.min(s.y0, s.y1);
  const w = Math.abs(s.x1 - s.x0);
  const h = Math.abs(s.y1 - s.y0);
  if (s.kind === "rect" || s.kind === "crop") {
    ctx.strokeRect(l, t, w, h);
    return;
  }
  if (s.kind === "oval") {
    ctx.beginPath();
    ctx.ellipse(l + w / 2, t + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(s.x0, s.y0);
  ctx.lineTo(s.x1, s.y1);
  ctx.stroke();
  const angle = Math.atan2(s.y1 - s.y0, s.x1 - s.x0);
  const len = 16;
  ctx.beginPath();
  ctx.moveTo(s.x1, s.y1);
  ctx.lineTo(s.x1 - len * Math.cos(angle - Math.PI / 6), s.y1 - len * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(s.x1, s.y1);
  ctx.lineTo(s.x1 - len * Math.cos(angle + Math.PI / 6), s.y1 - len * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

export function ImageAnnotator({ sourceUrl, onCancel, onConfirm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [tool, setTool] = useState<Tool>("draw");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [draft, setDraft] = useState<Stroke | null>(null);
  const [busy, setBusy] = useState(false);
  const ink = "#e53935";

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const fit = fitRect(img.naturalWidth, img.naturalHeight, canvas.width, canvas.height);
    ctx.drawImage(img, fit.left, fit.top, fit.width, fit.height);
    [...strokes, ...(draft ? [draft] : [])].forEach((s) => drawStroke(ctx, s));
  }, [strokes, draft]);

  useEffect(() => {
    const img = new Image();
    if (!sourceUrl.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      const w = Math.min(parent?.clientWidth || 720, 900);
      const h = Math.min(Math.round(w * 0.7), 560);
      canvas.width = w;
      canvas.height = h;
      redraw();
    };
    img.src = sourceUrl;
  }, [sourceUrl, redraw]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const pos = (e: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pos(e);
    if (tool === "draw") {
      setDraft({ kind: "draw", points: [p], color: ink, width: 3 });
    } else {
      setDraft({ kind: tool, x0: p.x, y0: p.y, x1: p.x, y1: p.y, color: ink, width: 3 });
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!draft) return;
    const p = pos(e);
    if (draft.kind === "draw") {
      setDraft({ ...draft, points: [...draft.points, p] });
    } else {
      setDraft({ ...draft, x1: p.x, y1: p.y });
    }
  };

  const applyCrop = (s: Extract<Stroke, { kind: "crop" }>) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const fit = fitRect(img.naturalWidth, img.naturalHeight, canvas.width, canvas.height);
    const l = Math.min(s.x0, s.x1);
    const t = Math.min(s.y0, s.y1);
    const r = Math.max(s.x0, s.x1);
    const b = Math.max(s.y0, s.y1);
    const sx = ((l - fit.left) / fit.width) * img.naturalWidth;
    const sy = ((t - fit.top) / fit.height) * img.naturalHeight;
    const sw = ((r - l) / fit.width) * img.naturalWidth;
    const sh = ((b - t) / fit.height) * img.naturalHeight;
    if (sw < 8 || sh < 8) return;
    const off = document.createElement("canvas");
    off.width = Math.max(1, Math.round(sw));
    off.height = Math.max(1, Math.round(sh));
    const ctx = off.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, off.width, off.height);
    const cropped = new Image();
    cropped.onload = () => {
      imgRef.current = cropped;
      setStrokes([]);
      setDraft(null);
      redraw();
    };
    cropped.src = off.toDataURL("image/jpeg", 0.92);
  };

  const onPointerUp = () => {
    if (!draft) return;
    if (draft.kind === "crop") {
      applyCrop(draft);
    } else {
      setStrokes((prev) => [...prev, draft]);
    }
    setDraft(null);
  };

  const exportBlob = async () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    setBusy(true);
    try {
      const fit = fitRect(img.naturalWidth, img.naturalHeight, canvas.width, canvas.height);
      const out = document.createElement("canvas");
      out.width = img.naturalWidth;
      out.height = img.naturalHeight;
      const ctx = out.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const sx = img.naturalWidth / fit.width;
      const sy = img.naturalHeight / fit.height;
      const mapStroke = (s: Stroke): Stroke => {
        if (s.kind === "draw") {
          return {
            ...s,
            width: s.width * sx,
            points: s.points.map((p) => ({
              x: (p.x - fit.left) * sx,
              y: (p.y - fit.top) * sy,
            })),
          };
        }
        return {
          ...s,
          width: s.width * sx,
          x0: (s.x0 - fit.left) * sx,
          y0: (s.y0 - fit.top) * sy,
          x1: (s.x1 - fit.left) * sx,
          y1: (s.y1 - fit.top) * sy,
        };
      };
      strokes.forEach((s) => drawStroke(ctx, mapStroke(s)));
      const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/jpeg", 0.85));
      if (!blob) throw new Error("Không xuất được ảnh");
      onConfirm(blob);
    } finally {
      setBusy(false);
    }
  };

  const tools: { id: Tool; label: string; icon: ReactNode }[] = [
    { id: "draw", label: "Vẽ", icon: <Pencil className="h-3.5 w-3.5" /> },
    { id: "rect", label: "Khung", icon: <Square className="h-3.5 w-3.5" /> },
    { id: "oval", label: "Oval", icon: <Circle className="h-3.5 w-3.5" /> },
    { id: "arrow", label: "Mũi tên", icon: <MoveUpRight className="h-3.5 w-3.5" /> },
    { id: "crop", label: "Cắt", icon: <Crop className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Hủy
          </Button>
          <div className="text-sm font-semibold">Chỉnh ảnh</div>
          <Button size="sm" disabled={busy} onClick={() => void exportBlob()}>
            <Check className="h-4 w-4 mr-1" />
            Gửi
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-border">
          {tools.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTool(t.id)}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs",
                tool === t.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-foreground"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setStrokes((prev) => prev.slice(0, -1))}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Undo
          </button>
        </div>
        <div className="bg-muted/30 p-3 flex justify-center">
          <canvas
            ref={canvasRef}
            className="max-w-full touch-none cursor-crosshair rounded-lg border border-border bg-background"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => setDraft(null)}
          />
        </div>
        <p className="px-4 py-2 text-[11px] text-muted-foreground">
          Kéo để vẽ / khung / mũi tên. Tool Cắt: kéo vùng rồi thả.
        </p>
      </div>
    </div>
  );
}
