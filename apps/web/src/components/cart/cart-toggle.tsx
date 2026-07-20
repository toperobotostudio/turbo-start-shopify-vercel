"use client";

import NumberFlow from "@number-flow/react";
import { Button } from "@workspace/ui/components/button";
import { Handbag } from "lucide-react";

import { useCart } from "./cart-context";

export function CartToggle() {
  const { cart, openCart } = useCart();
  const quantity = cart?.totalQuantity ?? 0;

  return (
    <Button
      aria-label={`Cart${quantity > 0 ? ` (${quantity} items)` : ""}`}
      className="relative"
      onClick={openCart}
      size="icon"
      variant="ghost"
    >
      <Handbag className="size-5" />
      {quantity > 0 && (
        <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-xs tabular-nums">
          <NumberFlow
            suffix={quantity > 99 ? "+" : undefined}
            value={Math.min(quantity, 99)}
          />
        </span>
      )}
    </Button>
  );
}
