import { useEffect, useRef, useState } from "react";
import { Eraser, Pen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SignaturePadProps {
  onChange?: (dataUrl: string | null) => void;
}

export const SignaturePad = ({ onChange }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "hsl(215 28% 17%)";
        ctx.lineWidth = 2.5;
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInk) setHasInk(true);
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange?.(canvasRef.current!.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange?.(null);
  };

  return (
    <div className="rounded-xl border-2 border-dashed border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Pen className="h-4 w-4" /> Chữ ký xác nhận
        </div>
        <Button variant="ghost" size="sm" onClick={clear} disabled={!hasInk}>
          <Eraser className="h-4 w-4 mr-1" /> Xóa
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        className="block w-full h-40 md:h-48 touch-none bg-white"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
    </div>
  );
};
