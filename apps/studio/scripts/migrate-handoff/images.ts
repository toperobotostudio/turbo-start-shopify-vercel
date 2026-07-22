/**
 * Local image upload + attachment for the hand-off migration.
 *
 * Shopify cannot fetch a local file path, so each dark PNG is pushed through a
 * staged upload (`stagedUploadsCreate` → HTTP POST the bytes → `resourceUrl`),
 * then attached with `productCreateMedia`. Each variant is then linked to its
 * colour's first image via `productVariantAppendMedia` so the storefront colour
 * swatch scrolls the gallery to the matching photo.
 */

import { readFileSync, statSync } from "node:fs";
import { basename, extname } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { adminQuery, hasUserErrors, log } from "../seed-shopify/client.js";
import type { UserError } from "../seed-shopify/types.js";
import type { HandoffImage, HandoffProduct } from "./load.js";

interface StagedTarget {
  url: string;
  resourceUrl: string;
  parameters: Array<{ name: string; value: string }>;
}

/** Infers the upload mime type from a file's extension. */
function mimeOf(file: string): string {
  switch (extname(file).toLowerCase()) {
    case ".webp":
      return "image/webp";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    default:
      return "image/png";
  }
}

/** Creates staged upload targets for the given files (batched). */
async function createStagedTargets(
  files: string[]
): Promise<StagedTarget[]> {
  const input = files.map((file) => ({
    filename: basename(file),
    mimeType: mimeOf(file),
    httpMethod: "POST",
    resource: "IMAGE",
    fileSize: String(statSync(file).size),
  }));

  const result = await adminQuery<{
    stagedUploadsCreate: {
      stagedTargets: StagedTarget[];
      userErrors: UserError[];
    };
  }>(
    `mutation($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url resourceUrl parameters { name value } }
        userErrors { field message }
      }
    }`,
    { input }
  );

  if (result.errors) {
    throw new Error(`stagedUploadsCreate: ${JSON.stringify(result.errors)}`);
  }
  const data = result.data?.stagedUploadsCreate;
  if (hasUserErrors(data?.userErrors, "stagedUploadsCreate")) {
    throw new Error("stagedUploadsCreate returned user errors");
  }
  const targets = data?.stagedTargets ?? [];
  if (targets.length !== files.length) {
    throw new Error(
      `stagedUploadsCreate returned ${targets.length} targets for ${files.length} files`
    );
  }
  return targets;
}

/** POSTs a file's bytes to its staged target. Returns the resourceUrl. */
async function uploadToTarget(
  file: string,
  target: StagedTarget
): Promise<string> {
  const form = new FormData();
  for (const { name, value } of target.parameters) {
    form.append(name, value);
  }
  const bytes = readFileSync(file);
  form.append("file", new Blob([bytes], { type: mimeOf(file) }), basename(file));

  const res = await fetch(target.url, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}) for ${basename(file)}: ${text}`);
  }
  return target.resourceUrl;
}

/** Stages + uploads a list of local files, returning their resource URLs (in order). */
export async function uploadFiles(files: string[]): Promise<string[]> {
  const targets = await createStagedTargets(files);
  const urls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    // biome-ignore lint/style/noNonNullAssertion: targets aligns with files by index
    urls.push(await uploadToTarget(files[i]!, targets[i]!));
  }
  return urls;
}

interface AttachedMedia {
  id: string;
  color: string;
  position: number;
}

/**
 * Uploads a product's dark images and attaches them as media, then links each
 * variant to its colour's first image. Returns nothing; logs progress.
 */
export async function uploadAndAttachDarkImages(
  productId: string,
  prod: HandoffProduct,
  variantIdsBySku: Record<string, string>,
  verbose: boolean
): Promise<void> {
  const images: HandoffImage[] = prod.darkImages;
  if (images.length === 0) {
    log.warn(`${prod.handle}: no dark images found`);
    return;
  }

  // 1. Stage + upload every file, preserving order.
  const targets = await createStagedTargets(images.map((i) => i.file));
  const sources: string[] = [];
  for (let i = 0; i < images.length; i++) {
    // biome-ignore lint/style/noNonNullAssertion: targets aligns with images by index
    sources.push(await uploadToTarget(images[i]!.file, targets[i]!));
  }

  // 2. Attach all as product media (media[] comes back in input order).
  const mediaInput = images.map((img, i) => ({
    originalSource: sources[i],
    alt: img.alt,
    mediaContentType: "IMAGE",
  }));

  const result = await adminQuery<{
    productCreateMedia: {
      media: Array<{ id: string; status: string }>;
      mediaUserErrors: UserError[];
    };
  }>(
    `mutation($productId: ID!, $media: [CreateMediaInput!]!) {
      productCreateMedia(productId: $productId, media: $media) {
        media { ... on MediaImage { id status } }
        mediaUserErrors { field message }
      }
    }`,
    { productId, media: mediaInput }
  );

  const created = result.data?.productCreateMedia;
  if (created?.mediaUserErrors?.length) {
    for (const e of created.mediaUserErrors) {
      log.warn(`${prod.handle} media: ${e.message}`);
    }
  }
  const media = created?.media ?? [];
  if (media.length !== images.length) {
    log.warn(
      `${prod.handle}: attached ${media.length}/${images.length} media`
    );
  }

  const attached: AttachedMedia[] = media.map((m, i) => ({
    id: m.id,
    // biome-ignore lint/style/noNonNullAssertion: media aligns with images by index
    color: images[i]!.color,
    position: images[i]!.position,
  }));

  if (verbose) log.info(`  ${media.length} images attached`);

  // 3. Wait for Shopify to finish processing, then link each variant to its
  //    colour's first image (append fails on non-READY media).
  await waitForMediaReady(
    attached.map((m) => m.id),
    verbose
  );
  await linkVariantImages(productId, prod, variantIdsBySku, attached, verbose);
}

/**
 * Polls media until every id is READY (or FAILED/timeout). Freshly uploaded
 * media is PROCESSING for a few seconds; variant linking requires READY.
 */
export async function waitForMediaReady(
  mediaIds: string[],
  verbose: boolean
): Promise<void> {
  if (mediaIds.length === 0) return;
  const deadline = Date.now() + 90_000;
  let delay = 1000;

  while (Date.now() < deadline) {
    const result = await adminQuery<{
      nodes: Array<{ id: string; status: string } | null>;
    }>(
      `query($ids: [ID!]!) {
        nodes(ids: $ids) { ... on MediaImage { id status } }
      }`,
      { ids: mediaIds }
    );

    const nodes = result.data?.nodes ?? [];
    const statuses = nodes.map((n) => n?.status ?? "PROCESSING");
    const pending = statuses.filter((s) => s !== "READY" && s !== "FAILED");
    if (pending.length === 0) {
      const failed = statuses.filter((s) => s === "FAILED").length;
      if (failed > 0) log.warn(`  ${failed} media failed to process`);
      if (verbose) log.info(`  media ready (${statuses.length})`);
      return;
    }

    await sleep(delay);
    delay = Math.min(delay * 1.5, 5000);
  }
  log.warn("  media readiness timed out — some variant links may be skipped");
}

/** Maps colour → first attached media id (lowest position). */
function firstMediaByColor(
  attached: AttachedMedia[]
): Record<string, string> {
  const byColor: Record<string, AttachedMedia> = {};
  for (const m of attached) {
    const current = byColor[m.color];
    if (!current || m.position < current.position) byColor[m.color] = m;
  }
  const result: Record<string, string> = {};
  for (const [color, m] of Object.entries(byColor)) result[color] = m.id;
  return result;
}

/**
 * Repairs variant→image links for an already-created product without
 * re-uploading. Fetches the product's existing media (in creation order, which
 * matches the hand-off dark-image order) and variants, waits for readiness, and
 * appends each variant its colour's first image. Idempotent.
 */
export async function relinkVariantImagesForProduct(
  prod: HandoffProduct,
  verbose: boolean
): Promise<boolean> {
  const result = await adminQuery<{
    productByHandle: {
      id: string;
      media: { nodes: Array<{ id: string; status: string } | null> };
      variants: { nodes: Array<{ id: string; sku: string }> };
    } | null;
  }>(
    `query($handle: String!) {
      productByHandle(handle: $handle) {
        id
        media(first: 50) { nodes { ... on MediaImage { id status } } }
        variants(first: 100) { nodes { id sku } }
      }
    }`,
    { handle: prod.handle }
  );

  const product = result.data?.productByHandle;
  if (!product) {
    log.warn(`relink: product not found — ${prod.handle}`);
    return false;
  }

  const mediaNodes = product.media.nodes.filter(
    (n): n is { id: string; status: string } => Boolean(n?.id)
  );
  if (mediaNodes.length !== prod.darkImages.length) {
    log.warn(
      `relink ${prod.handle}: media count ${mediaNodes.length} ≠ expected ${prod.darkImages.length} — skipping`
    );
    return false;
  }

  await waitForMediaReady(
    mediaNodes.map((m) => m.id),
    verbose
  );

  const attached: AttachedMedia[] = mediaNodes.map((m, i) => ({
    id: m.id,
    // biome-ignore lint/style/noNonNullAssertion: media aligns with dark images by creation order
    color: prod.darkImages[i]!.color,
    // biome-ignore lint/style/noNonNullAssertion: media aligns with dark images by creation order
    position: prod.darkImages[i]!.position,
  }));

  const variantIdsBySku: Record<string, string> = {};
  for (const v of product.variants.nodes) {
    if (v.sku) variantIdsBySku[v.sku] = v.id;
  }

  await linkVariantImages(product.id, prod, variantIdsBySku, attached, verbose);
  return true;
}

async function linkVariantImages(
  productId: string,
  prod: HandoffProduct,
  variantIdsBySku: Record<string, string>,
  attached: AttachedMedia[],
  verbose: boolean
): Promise<void> {
  const firstByColor = firstMediaByColor(attached);

  const variantMedia: Array<{ variantId: string; mediaIds: string[] }> = [];
  for (const v of prod.variants) {
    const variantId = variantIdsBySku[v.sku];
    const mediaId = firstByColor[v.color];
    if (!variantId || !mediaId) continue;
    variantMedia.push({ variantId, mediaIds: [mediaId] });
  }

  if (variantMedia.length === 0) return;

  const result = await adminQuery<{
    productVariantAppendMedia: {
      userErrors: UserError[];
    };
  }>(
    `mutation($productId: ID!, $variantMedia: [ProductVariantAppendMediaInput!]!) {
      productVariantAppendMedia(productId: $productId, variantMedia: $variantMedia) {
        userErrors { field message }
      }
    }`,
    { productId, variantMedia }
  );

  const errs = result.data?.productVariantAppendMedia?.userErrors;
  if (errs?.length) {
    for (const e of errs) log.warn(`${prod.handle} variant media: ${e.message}`);
  } else if (verbose) {
    log.info(`  ${variantMedia.length} variant images linked`);
  }
}
