import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X } from "lucide-react";

interface QrScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
}

export const QrScanner = ({ open, onClose, onScan }: QrScannerProps) => {
  const elRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!open || !elRef.current) return;

    const id = "qr-reader-region";
    elRef.current.id = id;
    const scanner = new Html5Qrcode(id, { verbose: false });
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decoded) => {
          if (navigator.vibrate) navigator.vibrate(120);
          scanner.stop().then(() => scanner.clear()).catch(() => {});
          onScan(decoded);
        },
        () => {}
      )
      .catch(() => {
        // Camera unavailable in preview - silent
      });

    return () => {
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {});
    };
  }, [open, onScan]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col animate-fade-in">
      <div className="flex items-center justify-between p-4 text-white">
        <div className="font-bold text-lg">Quét mã QR thiết bị</div>
        <button
          onClick={onClose}
          className="touch-target rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
          aria-label="Đóng"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <div ref={elRef} className="w-full h-full max-w-2xl" />

        {/* Frame overlay */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative w-[280px] h-[280px]">
            <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-primary-glow rounded-tl-lg" />
            <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-primary-glow rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-primary-glow rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-primary-glow rounded-br-lg" />
          </div>
        </div>
      </div>

      <div className="p-6 text-center text-white/80 text-sm">
        Đặt mã QR vào trong khung để quét tự động
      </div>
    </div>
  );
};
