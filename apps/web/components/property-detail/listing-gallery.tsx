"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { Button } from "@propad/ui";
import { LightboxModal } from "@/components/property-detail/lightbox-modal";
import { getImageUrl } from "@/lib/image-url";
import { PROPERTY_PLACEHOLDER_IMAGE } from "@/lib/property-placeholder";

interface GalleryMedia {
  id?: string;
  url: string;
}

export function ListingGallery({
  media,
  title,
}: {
  media: GalleryMedia[];
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const mobileTrackRef = useRef<HTMLDivElement | null>(null);

  const images = useMemo(
    () =>
      media
        .filter((item) => Boolean(item?.url))
        .map((item, itemIndex) => ({
          id: item.id ?? `${itemIndex}`,
          url: getImageUrl(item.url),
          alt: `${title} photo ${itemIndex + 1}`,
        })),
    [media, title],
  );

  if (!images.length) {
    return (
      <section className="rounded-2xl border border-border bg-card p-8 text-card-foreground">
        <div className="relative h-80 overflow-hidden rounded-xl bg-muted">
          <Image
            src={PROPERTY_PLACEHOLDER_IMAGE}
            alt="Property"
            fill
            className="object-cover"
          />
        </div>
      </section>
    );
  }

  const desktopCount = Math.min(5, images.length);
  const desktopImages = images.slice(0, desktopCount);

  return (
    <section className="space-y-3">
      <div className="relative md:hidden">
        <div
          ref={mobileTrackRef}
          className="flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-2xl"
          onScroll={(event) => {
            const element = event.currentTarget;
            const step = element.clientWidth + 8;
            if (step <= 0) return;
            const currentIndex = Math.round(element.scrollLeft / step);
            setIndex(Math.min(images.length - 1, Math.max(0, currentIndex)));
          }}
        >
          {images.map((image, imageIndex) => (
            <button
              key={image.id}
              type="button"
              className="relative h-72 w-full shrink-0 snap-center overflow-hidden rounded-2xl bg-muted"
              onClick={() => {
                setIndex(imageIndex);
                setOpen(true);
              }}
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
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {images.slice(0, 8).map((_, dotIndex) => (
              <button
                key={dotIndex}
                type="button"
                aria-label={`Go to photo ${dotIndex + 1}`}
                onClick={() => {
                  setIndex(dotIndex);
                  mobileTrackRef.current?.scrollTo({
                    left: dotIndex * (mobileTrackRef.current.clientWidth + 8),
                    behavior: "smooth",
                  });
                }}
                className={`h-2 w-2 rounded-full ${
                  dotIndex === index
                    ? "bg-foreground"
                    : "bg-muted-foreground/40"
                }`}
              />
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            All photos ({images.length})
          </Button>
        </div>
      </div>

      <div className="hidden grid-cols-4 gap-3 md:grid">
        {desktopImages[0] ? (
          <button
            type="button"
            className={`relative overflow-hidden rounded-2xl bg-muted ${
              desktopImages.length >= 3
                ? "col-span-2 row-span-2 h-[420px]"
                : "col-span-4 h-[420px]"
            }`}
            onClick={() => {
              setIndex(0);
              setOpen(true);
            }}
          >
            <Image
              src={desktopImages[0].url}
              alt={desktopImages[0].alt}
              fill
              className="object-cover"
            />
          </button>
        ) : null}

        {desktopImages.slice(1).map((image, idx) => (
          <button
            key={image.id}
            type="button"
            className="relative h-[203px] overflow-hidden rounded-2xl bg-muted"
            onClick={() => {
              setIndex(idx + 1);
              setOpen(true);
            }}
          >
            <Image
              src={image.url}
              alt={image.alt}
              fill
              className="object-cover"
            />
            {idx === desktopImages.length - 2 &&
            images.length > desktopImages.length ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-semibold text-white">
                +{images.length - desktopImages.length} photos
              </div>
            ) : null}
          </button>
        ))}
      </div>

      <LightboxModal
        images={images}
        open={open}
        index={index}
        onOpenChange={setOpen}
        onIndexChange={setIndex}
      />
    </section>
  );
}
