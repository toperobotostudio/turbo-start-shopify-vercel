"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import {
  addToCart,
  getCart,
  removeCartLine,
  updateCartLine,
} from "@/app/cart/actions";
import { type AddLineResult, CartController } from "@/lib/cart/controller";
import type { CartError, CartWarning, LineMetadata } from "@/lib/cart/types";
import type { Cart } from "@/lib/shopify/types";

type CartContextValue = {
  cart: Cart | null;
  confirmedCart: Cart | null;
  isLoading: boolean;
  isMutating: boolean;
  isCreatingCart: boolean;
  hasPendingAdds: boolean;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  cartError: CartError | null;
  warnings: CartWarning[];
  clearCartError: () => void;
  clearWarnings: () => void;
  addLine: (
    variantId: string,
    quantity: number,
    metadata: LineMetadata
  ) => Promise<AddLineResult>;
  updateLine: (lineId: string, quantity: number) => void;
  swapLineVariant: (
    lineId: string,
    merchandiseId: string,
    quantity: number,
    metadata?: Partial<LineMetadata>
  ) => void;
  removeLine: (lineId: string) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  children,
  initialCart,
}: {
  children: React.ReactNode;
  initialCart?: Cart | null;
}) {
  const [controller] = useState(() => {
    const instance = new CartController({
      getCart,
      addLines: addToCart,
      updateLine: updateCartLine,
      removeLine: removeCartLine,
    });
    if (initialCart !== undefined) {
      instance.seed(initialCart);
    }
    return instance;
  });

  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot
  );

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(initialCart === undefined);

  useEffect(() => {
    if (initialCart !== undefined) return;
    let cancelled = false;
    getCart()
      .then((cart) => {
        controller.seed(cart);
      })
      .catch(() => {
        controller.seed(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [controller, initialCart]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        controller.refetch();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [controller]);

  useEffect(() => {
    return () => {
      controller.dispose();
    };
  }, [controller]);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const clearCartError = useCallback(
    () => controller.clearError(),
    [controller]
  );
  const clearWarnings = useCallback(
    () => controller.clearWarnings(),
    [controller]
  );

  const addLine = useCallback(
    (variantId: string, quantity: number, metadata: LineMetadata) =>
      controller.addLine(variantId, quantity, metadata),
    [controller]
  );
  const updateLine = useCallback(
    (lineId: string, quantity: number) =>
      controller.updateLine(lineId, quantity),
    [controller]
  );
  const swapLineVariant = useCallback(
    (
      lineId: string,
      merchandiseId: string,
      quantity: number,
      metadata?: Partial<LineMetadata>
    ) => controller.swapLineVariant(lineId, merchandiseId, quantity, metadata),
    [controller]
  );
  const removeLine = useCallback(
    (lineId: string) => controller.removeLine(lineId),
    [controller]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cart: snapshot.cartWithPending,
      confirmedCart: snapshot.cart,
      isLoading,
      isMutating: snapshot.isMutating,
      isCreatingCart: snapshot.isCreatingCart,
      hasPendingAdds: snapshot.hasPendingAdds,
      isCartOpen,
      openCart,
      closeCart,
      cartError: snapshot.error,
      warnings: snapshot.warnings,
      clearCartError,
      clearWarnings,
      addLine,
      updateLine,
      swapLineVariant,
      removeLine,
    }),
    [
      snapshot,
      isLoading,
      isCartOpen,
      openCart,
      closeCart,
      clearCartError,
      clearWarnings,
      addLine,
      updateLine,
      swapLineVariant,
      removeLine,
    ]
  );

  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
