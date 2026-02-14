"use client";

import { useState } from "react";
import { PROPERTY_PLACEHOLDER_IMAGE } from "@/lib/property-placeholder";

interface PropertyImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}

const DEFAULT_FALLBACK = PROPERTY_PLACEHOLDER_IMAGE;

export function PropertyImage({
  src,
  alt,
  className = "",
  fallbackSrc = DEFAULT_FALLBACK,
}: PropertyImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      console.error("Image load error:", src);
      setHasError(true);
      setImgSrc(fallbackSrc);
    }
  };

  return (
    <img src={imgSrc} alt={alt} className={className} onError={handleError} />
  );
}
