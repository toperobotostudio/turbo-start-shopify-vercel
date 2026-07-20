"use client";

import { Button } from "@workspace/ui/components/button";
import { useState } from "react";

import { useCart } from "@/components/cart/cart-context";
import type { LineMetadata } from "@/lib/cart/types";

type AddToCartProps = {
  variantId: string;
  availableForSale: boolean;
  metadata: LineMetadata;
  optionsSelected?: boolean;
  quantity?: number;
};

export function AddToCart({
  variantId,
  availableForSale,
  metadata,
  optionsSelected = true,
  quantity = 1,
}: AddToCartProps) {
  const { addLine, openCart } = useCart();
  const [error, setError] = useState<string | null>(null);

  if (!availableForSale) {
    return (
      <Button
        className="h-9 w-full rounded-none text-base uppercase"
        disabled
        variant="default"
      >
        Sold Out
      </Button>
    );
  }

  if (!optionsSelected) {
    return (
      <Button
        className="h-9 w-full rounded-none text-base uppercase"
        disabled
        variant="default"
      >
        Select Options
      </Button>
    );
  }

  return (
    <div className="w-full">
      <Button
        className="h-9 w-full rounded-none border-none bg-zinc-900 text-base text-zinc-100 tracking-wide transition-colors hover:bg-zinc-800 hover:text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:hover:text-zinc-900"
        onClick={() => {
          setError(null);
          openCart();
          addLine(variantId, quantity, metadata).then((result) => {
            if (!result.ok) {
              setError("Unable to add to cart. Please try again.");
            }
          });
        }}
      >
        Add to cart
      </Button>
      {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
    </div>
  );
}
