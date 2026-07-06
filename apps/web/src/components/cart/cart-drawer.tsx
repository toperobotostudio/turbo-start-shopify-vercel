"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { X } from "lucide-react";

import { useCart } from "./cart-context";
import { CartEmptyState } from "./cart-empty-state";
import { CartLineItem } from "./cart-line-item";
import { CartSummary } from "./cart-summary";

export function CartDrawer() {
  const { cart, isCartOpen, closeCart } = useCart();

  const lines = cart?.lines.edges.map((e) => e.node) ?? [];
  const isEmpty = lines.length === 0;

  return (
    <Sheet onOpenChange={(open) => !open && closeCart()} open={isCartOpen}>
      <SheetContent
        className="w-full gap-8 p-8 sm:max-w-[540px]"
        showCloseButton={false}
        side="right"
      >
        <SheetHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <SheetTitle className="font-medium text-[32px] leading-tight">
            Cart
          </SheetTitle>
          <SheetDescription className="sr-only">
            Your shopping cart
          </SheetDescription>
          <button
            className="inline-flex items-center gap-1 text-base text-foreground tracking-[0.24px] transition-opacity hover:opacity-70"
            onClick={closeCart}
            type="button"
          >
            Close
            <X className="size-[18px]" />
          </button>
        </SheetHeader>

        {isEmpty ? (
          <CartEmptyState />
        ) : (
          <>
            <div className="-mx-8 flex-1 overflow-y-auto px-8">
              <div className="divide-y divide-border">
                {lines.map((line) => (
                  <CartLineItem key={line.id} line={line} />
                ))}
              </div>
            </div>

            {cart && (
              <SheetFooter className="gap-4 p-0">
                <CartSummary cart={cart} />
                <Button
                  className="w-full"
                  onClick={() => {
                    window.location.href = cart.checkoutUrl;
                  }}
                  size="lg"
                >
                  Go to checkout
                </Button>
              </SheetFooter>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
