import { Camera, X, Plus, ImageIcon } from "lucide-react";
import { useRef } from "react";

const compressImage = (file: File, max = 1280): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

interface PhotoGalleryProps {
  photos: string[];
  onChange: (next: string[]) => void;
  max?: number;
  label?: string;
  hint?: string;
  compact?: boolean;
}

export const PhotoGallery = ({
  photos,
  onChange,
  max = 6,
  label = "Ảnh minh chứng",
  hint = "Chụp ảnh hiện trạng thiết bị (tối đa " + 6 + " ảnh)",
  compact = false,
}: PhotoGalleryProps) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remain = max - photos.length;
    const slice = files.slice(0, remain);
    const compressed = await Promise.all(slice.map((f) => compressImage(f)));
    onChange([...photos, ...compressed]);
    e.target.value = "";
  };

  const remove = (idx: number) => onChange(photos.filter((_, i) => i !== idx));

  const canAdd = photos.length < max;

  return (
    <div className={compact ? "" : "rounded-xl border-2 border-dashed border-border bg-card p-4 md:p-5"}>
      {!compact && (
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <ImageIcon className="h-5 w-5 text-primary" />
              {label}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>
          </div>
          <span className="text-xs font-mono px-2 py-1 rounded-md bg-muted text-muted-foreground">
            {photos.length}/{max}
          </span>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={onFiles}
      />

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {photos.map((src, i) => (
          <div
            key={i}
            className="relative aspect-square rounded-lg overflow-hidden border-2 border-border bg-muted group"
          >
            <img src={src} alt={`Ảnh ${i + 1}`} className="w-full h-full object-cover" />
            <button
              onClick={() => remove(i)}
              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-card active:scale-95"
              aria-label="Xóa ảnh"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="absolute bottom-1 left-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/60 text-white">
              #{i + 1}
            </div>
          </div>
        ))}

        {canAdd && (
          <button
            onClick={() => fileRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-primary/40 bg-accent/40 hover:bg-accent hover:border-primary text-primary flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
          >
            {photos.length === 0 ? (
              <>
                <Camera className="h-7 w-7" />
                <span className="text-xs font-semibold">Chụp ảnh</span>
              </>
            ) : (
              <>
                <Plus className="h-6 w-6" />
                <span className="text-xs font-medium">Thêm</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
