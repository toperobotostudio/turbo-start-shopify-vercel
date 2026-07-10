"use client";

import { Button } from "@workspace/ui/components/button";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { checkVariantInventory } from "@/app/cart/actions";
import { useCart } from "@/components/cart/cart-context";

type AddToCartProps = {
  variantId: string;
  availableForSale: boolean;
  optionsSelected?: boolean;
  quantity?: number;
};

export function AddToCart({
  variantId,
  availableForSale,
  optionsSelected = true,
  quantity = 1,
}: AddToCartProps) {
  const { addLine, openCart } = useCart();
  const [isPending, setIsPending] = useState(false);
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
        disabled={isPending}
        onClick={async () => {
          setIsPending(true);
          setError(null);

          const inventory = await checkVariantInventory(variantId);

          if (!inventory.ok) {
            setError("Unable to verify availability. Please try again.");
            setIsPending(false);
            return;
          }

          if (!inventory.availableForSale) {
            setError("This item just sold out");
            setIsPending(false);
            return;
          }

          if (inventory.quantityAvailable === 0) {
            setError("This item is no longer available");
            setIsPending(false);
            return;
          }

          await addLine(variantId, quantity);
          setIsPending(false);
          openCart();
        }}
      >
        {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Add to cart
      </Button>
      {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
    </div>
  );
}
