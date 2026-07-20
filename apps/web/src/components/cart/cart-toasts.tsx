"use client";

import { toast } from "@workspace/ui/components/sonner";
import { useEffect } from "react";

import { useCart } from "./cart-context";

export function CartToasts() {
  const { warnings, cartError, clearWarnings, clearCartError } = useCart();

  useEffect(() => {
    if (warnings.length === 0) return;
    for (const warning of warnings) {
      toast.warning(warning.message);
    }
    clearWarnings();
  }, [warnings, clearWarnings]);

  useEffect(() => {
    if (!cartError) return;
    const cartGone =
      cartError.code === "CART_NOT_FOUND" ||
      cartError.code === "CART_COMPLETED";
    if (cartError.lineId && !cartGone) return;
    toast.error(cartError.message);
    clearCartError();
  }, [cartError, clearCartError]);

  return null;
}
