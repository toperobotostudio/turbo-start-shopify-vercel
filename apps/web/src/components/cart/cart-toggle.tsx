"use client";

import NumberFlow from "@number-flow/react";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { Handbag } from "lucide-react";

import { useCart } from "./cart-context";

export function CartToggle() {
  const { cart, openCart } = useCart();
  const quantity = cart?.totalQuantity ?? 0;
  const hasItems = quantity > 0;

  return (
    <Button
      aria-label={`Cart${hasItems ? ` (${quantity} items)` : ""}`}
      className="relative"
      onClick={openCart}
      size="icon"
      variant="ghost"
    >
      <Handbag className="size-5" />
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
    </Button>
  );
}
