"use client";

import { cn } from "@workspace/ui/lib/utils";
import Image, { type ImageProps } from "next/image";
import { useState } from "react";

import { shopifyLoResUrl } from "@/lib/shopify/image";

type ShopifyImageProps = Omit<ImageProps, "placeholder" | "src"> & {
  src: string;
};

/**
 * Drop-in for next/image on Shopify CDN images. Mirrors the blur-up that
 * `sanity-image` gives Sanity assets: a tiny CSS-blurred low-res variant paints
 * first, then crossfades to the full image once it loads. Shopify ships no LQIP,
 * so the placeholder source is a `?width=32` CDN variant.
 */
export function ShopifyImage({ src, className, ...props }: ShopifyImageProps) {
  const [loaded, setLoaded] = useState(false);

  if (!src) {
    return null;
  }

  return (
    <>
      <Image
        {...props}
        className={className}
        onLoad={() => setLoaded(true)}
        src={src}
      />
      {/* Low-res blur-up placeholder — sits on top, fades out once the full
          image loads (cached images load instantly, so no flash). */}
      {/* biome-ignore lint/performance/noImgElement: tiny CDN placeholder must bypass the optimizer */}
      <img
        alt=""
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover blur-2xl transition-opacity duration-500",
          loaded && "opacity-0"
        )}
        src={shopifyLoResUrl(src)}
      />
    </>
  );
}
