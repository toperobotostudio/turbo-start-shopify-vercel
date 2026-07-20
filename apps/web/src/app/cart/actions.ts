"use server";

import { Logger } from "@workspace/logger";
import { z } from "zod";

import { normalizeCart } from "@/lib/cart/engine";
import {
  clearCartId,
  getCartId,
  invalidateCartCache,
  setCartId,
} from "@/lib/cart/server";
import type {
  CartActionResult,
  CartErrorCode,
  CartWarning,
} from "@/lib/cart/types";
import {
  type StorefrontFailureKind,
  storefrontQuery,
} from "@/lib/shopify/client";
import {
  CART_CREATE_MUTATION,
  CART_LINES_ADD_MUTATION,
  CART_LINES_REMOVE_MUTATION,
  CART_LINES_UPDATE_MUTATION,
  CART_QUERY,
} from "@/lib/shopify/mutations";
import { PRODUCT_QUERY } from "@/lib/shopify/queries";
import type {
  Cart,
  CartLineInput,
  CartMutationPayload,
  ProductQueryResponse,
  ShopifyCartUserError,
  ShopifyCartWarning,
  ShopifyProductOption,
  ShopifyVariant,
} from "@/lib/shopify/types";

const logger = new Logger("CartActions");

const quantitySchema = z.number().int().min(1).max(99);
const idSchema = z.string().min(1);
const linesSchema = z
  .array(z.object({ merchandiseId: idSchema, quantity: quantitySchema }))
  .min(1);
const updateLineSchema = z.object({
  lineId: idSchema,
  quantity: quantitySchema,
  merchandiseId: idSchema.optional(),
});

const CART_GONE_PATTERN =
  /cart\s+(?:does\s?n.t\s+exist|not\s+found|could\s+not\s+be\s+found)/i;
const CART_COMPLETED_PATTERN = /cart.{0,40}(?:complete|purchased)/i;

const VARIANT_UNAVAILABLE_CODES = new Set([
  "MERCHANDISE_NOT_FOUND",
  "MERCHANDISE_OUT_OF_STOCK",
  "PRODUCT_NOT_AVAILABLE",
  "INVALID_MERCHANDISE_LINE",
]);

const CLAMP_WARNING_CODES = new Set([
  "MERCHANDISE_NOT_ENOUGH_STOCK",
  "MERCHANDISE_OUT_OF_STOCK",
]);

type RequestedLine = {
  key: "lineId" | "merchandiseId";
  id: string;
  quantity: number;
  exact: boolean;
};

function failure(code: CartErrorCode, message: string): CartActionResult {
  return { ok: false, error: { code, message } };
}

function invalidInput(error: z.ZodError): CartActionResult {
  return failure("INVALID_INPUT", error.issues[0]?.message ?? "Invalid input");
}

function classifyTransportError(
  error: string,
  kind: StorefrontFailureKind
): { code: CartErrorCode; message: string } {
  if (kind === "network") return { code: "NETWORK", message: error };
  if (CART_GONE_PATTERN.test(error)) {
    return { code: "CART_NOT_FOUND", message: error };
  }
  return { code: "UNKNOWN", message: error };
}

function classifyUserErrors(
  userErrors: ShopifyCartUserError[]
): { code: CartErrorCode; message: string } | null {
  const first = userErrors[0];
  if (!first) return null;
  if (CART_GONE_PATTERN.test(first.message)) {
    return { code: "CART_NOT_FOUND", message: first.message };
  }
  if (CART_COMPLETED_PATTERN.test(first.message)) {
    return { code: "CART_COMPLETED", message: first.message };
  }
  if (first.code && VARIANT_UNAVAILABLE_CODES.has(first.code)) {
    return { code: "VARIANT_UNAVAILABLE", message: first.message };
  }
  return { code: "SHOPIFY_USER_ERROR", message: first.message };
}

function mapShopifyWarning(warning: ShopifyCartWarning): CartWarning {
  return {
    code: CLAMP_WARNING_CODES.has(warning.code) ? "QUANTITY_CLAMPED" : "OTHER",
    lineId: warning.target ?? undefined,
    message: warning.message,
  };
}

function silentClampWarning(
  cart: Cart,
  request: RequestedLine
): CartWarning | null {
  const line = cart.lines.edges.find((edge) =>
    request.key === "lineId"
      ? edge.node.id === request.id
      : edge.node.merchandise.id === request.id
  )?.node;
  if (!line) {
    return {
      code: "LINE_DROPPED",
      lineId: request.key === "lineId" ? request.id : undefined,
      message: "An item is no longer available and was removed.",
    };
  }
  const clamped = request.exact
    ? line.quantity !== request.quantity
    : line.quantity < request.quantity;
  if (!clamped) return null;
  return {
    code: "QUANTITY_CLAMPED",
    lineId: line.id,
    message: `Only ${line.quantity} available — quantity adjusted.`,
  };
}

function detectSilentClamps(
  cart: Cart,
  requested: RequestedLine[],
  existing: CartWarning[]
): CartWarning[] {
  const seen = new Set(existing.map((w) => `${w.code}:${w.lineId ?? ""}`));
  const extra: CartWarning[] = [];
  for (const request of requested) {
    const warning = silentClampWarning(cart, request);
    if (!warning) continue;
    const key = `${warning.code}:${warning.lineId ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    extra.push(warning);
  }
  return extra;
}

async function settleTransportFailure(
  label: string,
  error: string,
  kind: StorefrontFailureKind
): Promise<CartActionResult> {
  const classified = classifyTransportError(error, kind);
  if (classified.code === "CART_NOT_FOUND") {
    await clearCartId();
  }
  logger.error(`${label} failed: ${classified.message}`);
  return { ok: false, error: classified };
}

async function settleMutation(
  label: string,
  payload: CartMutationPayload | undefined,
  requested: RequestedLine[]
): Promise<CartActionResult> {
  if (!payload) {
    return failure("UNKNOWN", `${label} returned an empty response`);
  }
  const userFailure = classifyUserErrors(payload.userErrors ?? []);
  if (userFailure) {
    if (
      userFailure.code === "CART_NOT_FOUND" ||
      userFailure.code === "CART_COMPLETED"
    ) {
      await clearCartId();
    }
    logger.error(`${label} user error: ${userFailure.message}`);
    return { ok: false, error: userFailure };
  }
  if (!payload.cart) {
    return failure("UNKNOWN", `${label} returned no cart`);
  }
  const cart = normalizeCart(payload.cart);
  const warnings = (payload.warnings ?? []).map(mapShopifyWarning);
  warnings.push(...detectSilentClamps(cart, requested, warnings));
  invalidateCartCache();
  return { ok: true, cart, warnings };
}

function requestedFromInputs(lines: CartLineInput[]): RequestedLine[] {
  return lines.map((line) => ({
    key: "merchandiseId" as const,
    id: line.merchandiseId,
    quantity: line.quantity,
    exact: false,
  }));
}

export async function createCart(
  lines: CartLineInput[]
): Promise<CartActionResult> {
  const parsed = linesSchema.safeParse(lines);
  if (!parsed.success) return invalidInput(parsed.error);

  const result = await storefrontQuery<{ cartCreate: CartMutationPayload }>(
    CART_CREATE_MUTATION,
    { variables: { lines: parsed.data } }
  );
  if (!result.ok) {
    return settleTransportFailure("createCart", result.error, result.kind);
  }

  const settled = await settleMutation(
    "createCart",
    result.data.cartCreate,
    requestedFromInputs(parsed.data)
  );
  if (settled.ok) {
    await setCartId(settled.cart.id);
  }
  return settled;
}

export async function addToCart(
  lines: CartLineInput[]
): Promise<CartActionResult> {
  const parsed = linesSchema.safeParse(lines);
  if (!parsed.success) return invalidInput(parsed.error);

  const cartId = await getCartId();
  if (!cartId) {
    return createCart(parsed.data);
  }

  const result = await storefrontQuery<{ cartLinesAdd: CartMutationPayload }>(
    CART_LINES_ADD_MUTATION,
    { variables: { cartId, lines: parsed.data } }
  );
  if (!result.ok) {
    return settleTransportFailure("addToCart", result.error, result.kind);
  }

  return settleMutation(
    "addToCart",
    result.data.cartLinesAdd,
    requestedFromInputs(parsed.data)
  );
}

export async function updateCartLine(
  lineId: string,
  quantity: number,
  merchandiseId?: string
): Promise<CartActionResult> {
  const parsed = updateLineSchema.safeParse({
    lineId,
    quantity,
    merchandiseId,
  });
  if (!parsed.success) return invalidInput(parsed.error);

  const cartId = await getCartId();
  if (!cartId) {
    return failure("CART_NOT_FOUND", "No cart found");
  }

  const line = parsed.data.merchandiseId
    ? {
        id: parsed.data.lineId,
        quantity: parsed.data.quantity,
        merchandiseId: parsed.data.merchandiseId,
      }
    : { id: parsed.data.lineId, quantity: parsed.data.quantity };

  const result = await storefrontQuery<{
    cartLinesUpdate: CartMutationPayload;
  }>(CART_LINES_UPDATE_MUTATION, {
    variables: { cartId, lines: [line] },
  });
  if (!result.ok) {
    return settleTransportFailure("updateCartLine", result.error, result.kind);
  }

  const requested: RequestedLine[] = parsed.data.merchandiseId
    ? [
        {
          key: "merchandiseId",
          id: parsed.data.merchandiseId,
          quantity: parsed.data.quantity,
          exact: false,
        },
      ]
    : [
        {
          key: "lineId",
          id: parsed.data.lineId,
          quantity: parsed.data.quantity,
          exact: true,
        },
      ];

  return settleMutation(
    "updateCartLine",
    result.data.cartLinesUpdate,
    requested
  );
}

export async function removeCartLine(
  lineId: string
): Promise<CartActionResult> {
  const parsed = idSchema.safeParse(lineId);
  if (!parsed.success) return invalidInput(parsed.error);

  const cartId = await getCartId();
  if (!cartId) {
    return failure("CART_NOT_FOUND", "No cart found");
  }

  const result = await storefrontQuery<{
    cartLinesRemove: CartMutationPayload;
  }>(CART_LINES_REMOVE_MUTATION, {
    variables: { cartId, lineIds: [parsed.data] },
  });
  if (!result.ok) {
    return settleTransportFailure("removeCartLine", result.error, result.kind);
  }

  return settleMutation("removeCartLine", result.data.cartLinesRemove, []);
}

export type ProductOptions = {
  options: ShopifyProductOption[];
  variants: ShopifyVariant[];
};

/**
 * Fetches a product's options and variants by handle — used to build the
 * in-cart Color/Size variant selectors. Returns null on error or missing
 * product so the caller can fall back to displaying the line's own options.
 */
export async function getProductOptions(
  handle: string
): Promise<ProductOptions | null> {
  const result = await storefrontQuery<ProductQueryResponse>(PRODUCT_QUERY, {
    variables: { handle },
  });

  if (!result.ok) {
    logger.error(`Failed to fetch product options: ${result.error}`);
    return null;
  }

  const product = result.data.product;
  if (!product) {
    return null;
  }

  return {
    options: product.options,
    variants: product.variants.edges.map((edge) => edge.node),
  };
}

export async function getCart(): Promise<Cart | null> {
  const cartId = await getCartId();

  if (!cartId) {
    return null;
  }

  const result = await storefrontQuery<{ cart: Cart | null }>(CART_QUERY, {
    variables: { cartId },
  });

  if (!result.ok) {
    logger.error(`Failed to fetch cart: ${result.error}`);
    throw new Error(`getCart failed (${result.kind}): ${result.error}`);
  }

  if (!result.data.cart) {
    try {
      await clearCartId();
    } catch {
      logger.warning("Could not clear stale cart cookie outside an action");
    }
    return null;
  }

  return normalizeCart(result.data.cart);
}
