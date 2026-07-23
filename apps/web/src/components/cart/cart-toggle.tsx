"use client";

import NumberFlow from "@number-flow/react";
import { cn } from "@workspace/ui/lib/utils";

import { BagIcon } from "../icons";
import { useCart } from "./cart-context";

export function CartToggle() {
  const { cart, openCart } = useCart();
  const quantity = cart?.totalQuantity ?? 0;
  const hasItems = quantity > 0;

  return (
    <button
      aria-label={`Cart${hasItems ? ` (${quantity} items)` : ""}`}
      className="relative inline-flex items-center justify-center transition-colors hover:text-foreground"
      onClick={openCart}
      type="button"
    >
      <BagIcon className="size-5" />
      <span
        aria-hidden
        className={cn(
          "absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-xs tabular-nums",
          "transition-[opacity,scale] duration-300 ease-out motion-reduce:transition-none",
          hasItems ? "scale-100 opacity-100" : "scale-50 opacity-0"
        )}
      >
        <NumberFlow
          suffix={quantity > 99 ? "+" : undefined}
          value={Math.min(quantity, 99)}
        />
      </span>
    </button>
  );
}
