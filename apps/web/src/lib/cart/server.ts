import "server-only";

import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";

export const CART_CACHE_TAG = "shopify-cart";

const CART_COOKIE = "shopify-cart-id";
const CART_COOKIE_STALE = "shopify-cart-id-stale";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export async function getCartId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CART_COOKIE)?.value ?? null;
}

export async function setCartId(cartId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CART_COOKIE, cartId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE,
  });
}

export async function clearCartId(): Promise<void> {
  const cookieStore = await cookies();
  const staleId = cookieStore.get(CART_COOKIE)?.value;
  if (staleId) {
    cookieStore.set(CART_COOKIE_STALE, staleId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: CART_COOKIE_MAX_AGE,
    });
  }
  cookieStore.delete(CART_COOKIE);
}

export function invalidateCartCache(): void {
  revalidateTag(CART_CACHE_TAG, "max");
}
