import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  src: string;
  onClose: () => void;
  /** Mở editor để annotate rồi gửi tin ảnh mới */
  onEdit?: () => void;
  editDisabled?: boolean;
};

/** Full-screen xem ảnh chat; tùy chọn chỉnh sửa → gửi lại. */
export function ImageLightbox({ src, onClose, onEdit, editDisabled }: Props) {
  return (
    <div
      className="fixed inset-0 z-[110] flex flex-col bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="flex items-center justify-between gap-2 px-3 py-2 bg-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={onClose}>
          <X className="h-4 w-4 mr-1" />
          Đóng
        </Button>
        {onEdit && (
          <Button
            size="sm"
            disabled={editDisabled}
            onClick={onEdit}
            className="gap-1"
          >
            <Pencil className="h-3.5 w-3.5" />
            Chỉnh sửa & gửi
          </Button>
        )}
      </div>
      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        <img
          src={src}
          alt="Ảnh chat"
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
