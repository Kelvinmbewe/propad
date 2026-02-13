"use client";

import Image from "next/image";
import { useEffect } from "react";
import { Button, Dialog, DialogContent } from "@propad/ui";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface GalleryImage {
  id: string;
  url: string;
  alt: string;
}

export function LightboxModal({
  images,
  open,
  index,
  onOpenChange,
  onIndexChange,
}: {
  images: GalleryImage[];
  open: boolean;
  index: number;
  onOpenChange: (next: boolean) => void;
  onIndexChange: (next: number) => void;
}) {
  const safeIndex = images.length
    ? Math.min(images.length - 1, Math.max(0, index))
    : 0;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        onIndexChange((safeIndex + 1) % images.length);
      }
      if (event.key === "ArrowLeft") {
        onIndexChange((safeIndex - 1 + images.length) % images.length);
      }
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [images.length, onIndexChange, onOpenChange, open, safeIndex]);

  if (!images.length) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[94vh] max-w-[95vw] border-border bg-background p-4">
        <div className="flex h-full flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {safeIndex + 1}/{images.length}
            </p>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="relative flex-1 overflow-hidden rounded-xl bg-muted">
            <Image
              src={images[safeIndex].url}
              alt={images[safeIndex].alt}
              fill
              className="object-contain"
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute left-3 top-1/2 -translate-y-1/2"
              onClick={() =>
                onIndexChange((safeIndex - 1 + images.length) % images.length)
              }
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-3 top-1/2 -translate-y-1/2"
              onClick={() => onIndexChange((safeIndex + 1) % images.length)}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="grid grid-cols-6 gap-2 overflow-x-auto md:grid-cols-10">
            {images.map((image, thumbIndex) => (
              <button
                key={image.id}
                type="button"
                onClick={() => onIndexChange(thumbIndex)}
                className={`relative h-16 overflow-hidden rounded-md border ${
                  thumbIndex === safeIndex
                    ? "border-emerald-500"
                    : "border-border"
                }`}
              >
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
