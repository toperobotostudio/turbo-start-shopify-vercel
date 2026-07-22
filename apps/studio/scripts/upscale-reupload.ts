/**
 * Stopgap: upscale the low-res (896x1200) dark product images ~3x with a
 * high-quality Lanczos resample + gentle sharpen, then replace each product's
 * Shopify media with the upscaled versions and re-link variant colour images.
 *
 * The hand-off dark set is capped at the generator ceiling (896x1200), which
 * looks soft on retina PDPs. This enlarges the asset so Next/Image serves a
 * properly-sized image instead of upscaling in the browser. Replace with a true
 * higher-res re-render when Jenil delivers one — this changes no handles/SKUs.
 *
 * Run from apps/studio:
 *   node --import tsx scripts/upscale-reupload.ts            # all 12 products
 *   node --import tsx scripts/upscale-reupload.ts --handle=aster-denim-coach-jacket
 */

import "./migrate-handoff/bootstrap-env.js";

import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

import { adminQuery, hasUserErrors, log } from "./seed-shopify/client.js";
import type { UserError } from "./seed-shopify/types.js";
import { loadProducts, type HandoffProduct } from "./migrate-handoff/load.js";
import { uploadFiles, waitForMediaReady } from "./migrate-handoff/images.js";

// Resolve sharp from the workspace pnpm store (not a direct studio dep).
const require = createRequire(import.meta.url);
const pnpmDir = resolve(process.cwd(), "../../node_modules/.pnpm");
const sharpEntry = readdirSync(pnpmDir).find((d) => d.startsWith("sharp@"));
if (!sharpEntry) throw new Error("sharp not found in node_modules/.pnpm");
// biome-ignore lint/suspicious/noExplicitAny: dynamically-resolved module
const sharp = require(join(pnpmDir, sharpEntry, "node_modules/sharp")) as any;

const SCALE = 3;
const SHARPEN_SIGMA = 1.0;
/** WEBP quality — visually ~lossless for photos, tiny vs PNG. */
const WEBP_QUALITY = 85;
/** Shopify caps staged image uploads at 20 MB; stay safely under. */
const MAX_BYTES = 19 * 1024 * 1024;
/** Scale factors tried in order until the encoded image fits under MAX_BYTES. */
const SCALE_STEPS = [SCALE, 2.5, 2];

const only = process.argv
  .find((a) => a.startsWith("--handle="))
  ?.slice("--handle=".length);

/**
 * Upscales one image with Lanczos + gentle sharpen, alpha kept, encoded as WEBP.
 * WEBP is ~97% smaller than PNG for these photos at the same dimensions — a
 * multi-MB PNG source made Next's image optimizer time out fetching it. Tries 3x
 * first and steps down (2.5x, 2x) only if it would exceed Shopify's upload limit
 * (WEBP effectively never does). Returns the scale actually used.
 */
async function upscale(src: string, dest: string): Promise<number> {
  const meta = await sharp(src).metadata();
  let last: { buf: Buffer; scale: number } | null = null;
  for (const scale of SCALE_STEPS) {
    const buf: Buffer = await sharp(src)
      .resize(Math.round(meta.width * scale), Math.round(meta.height * scale), {
        kernel: "lanczos3",
      })
      .sharpen({ sigma: SHARPEN_SIGMA })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    last = { buf, scale };
    if (buf.length <= MAX_BYTES) break;
  }
  writeFileSync(dest, last!.buf);
  return last!.scale;
}

/** color → first (lowest-position) media id. */
function firstMediaByColor(
  items: Array<{ id: string; color: string; position: number }>
): Record<string, string> {
  const best: Record<string, { id: string; position: number }> = {};
  for (const m of items) {
    if (!best[m.color] || m.position < best[m.color]!.position) {
      best[m.color] = { id: m.id, position: m.position };
    }
  }
  return Object.fromEntries(Object.entries(best).map(([c, v]) => [c, v.id]));
}

async function reuploadProduct(prod: HandoffProduct): Promise<boolean> {
  // 1. Existing product: id, current media (to delete), variants (sku→id).
  const res = await adminQuery<{
    productByHandle: {
      id: string;
      media: { nodes: Array<{ id: string } | null> };
      variants: { nodes: Array<{ id: string; sku: string }> };
    } | null;
  }>(
    `query($handle: String!) {
      productByHandle(handle: $handle) {
        id
        media(first: 50) { nodes { ... on MediaImage { id } } }
        variants(first: 100) { nodes { id sku } }
      }
    }`,
    { handle: prod.handle }
  );
  const product = res.data?.productByHandle;
  if (!product) {
    log.warn(`skip (not found): ${prod.handle}`);
    return false;
  }
  const oldMediaIds = product.media.nodes
    .filter((n): n is { id: string } => Boolean(n?.id))
    .map((n) => n.id);
  const variantIdBySku = Object.fromEntries(
    product.variants.nodes.filter((v) => v.sku).map((v) => [v.sku, v.id])
  );

  // 2. Upscale every dark image to a temp dir.
  const dir = mkdtempSync(join(tmpdir(), `upscale-${prod.handle}-`));
  try {
    const files: string[] = [];
    for (const img of prod.darkImages) {
      const dest = join(dir, basename(img.file).replace(/\.png$/i, ".webp"));
      const usedScale = await upscale(img.file, dest);
      if (usedScale < SCALE) {
        log.info(`  ${basename(img.file)}: used ${usedScale}x (size cap)`);
      }
      files.push(dest);
    }

    // 3. Stage + upload, then attach as new media (order = dark-image order).
    const sources = await uploadFiles(files);
    const attach = await adminQuery<{
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
      {
        productId: product.id,
        media: prod.darkImages.map((img, i) => ({
          originalSource: sources[i],
          alt: img.alt,
          mediaContentType: "IMAGE",
        })),
      }
    );
    const created = attach.data?.productCreateMedia;
    if (created?.mediaUserErrors?.length) {
      for (const e of created.mediaUserErrors) {
        log.warn(`${prod.handle} attach: ${e.message}`);
      }
    }
    const newMedia = created?.media ?? [];
    if (newMedia.length !== prod.darkImages.length) {
      log.warn(
        `${prod.handle}: attached ${newMedia.length}/${prod.darkImages.length} — aborting this product`
      );
      return false;
    }

    // 4. Wait for processing, then delete the old low-res media.
    await waitForMediaReady(
      newMedia.map((m) => m.id),
      true
    );
    const del = await adminQuery<{
      productDeleteMedia: {
        deletedMediaIds: string[];
        mediaUserErrors: UserError[];
      };
    }>(
      `mutation($productId: ID!, $mediaIds: [ID!]!) {
        productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
          deletedMediaIds
          mediaUserErrors { field message }
        }
      }`,
      { productId: product.id, mediaIds: oldMediaIds }
    );
    if (hasUserErrors(del.data?.productDeleteMedia?.mediaUserErrors, `${prod.handle} delete`)) {
      // non-fatal — continue to relink
    }

    // 5. Re-link each variant to its colour's first NEW image.
    const attached = newMedia.map((m, i) => ({
      id: m.id,
      // biome-ignore lint/style/noNonNullAssertion: newMedia aligns with darkImages by index
      color: prod.darkImages[i]!.color,
      // biome-ignore lint/style/noNonNullAssertion: newMedia aligns with darkImages by index
      position: prod.darkImages[i]!.position,
    }));
    const firstByColor = firstMediaByColor(attached);
    const variantMedia = prod.variants
      .map((v) => ({
        variantId: variantIdBySku[v.sku],
        mediaIds: firstByColor[v.color] ? [firstByColor[v.color]!] : [],
      }))
      .filter((vm) => vm.variantId && vm.mediaIds.length);

    if (variantMedia.length) {
      const link = await adminQuery<{
        productVariantAppendMedia: { userErrors: UserError[] };
      }>(
        `mutation($productId: ID!, $variantMedia: [ProductVariantAppendMediaInput!]!) {
          productVariantAppendMedia(productId: $productId, variantMedia: $variantMedia) {
            userErrors { field message }
          }
        }`,
        { productId: product.id, variantMedia }
      );
      const errs = link.data?.productVariantAppendMedia?.userErrors;
      if (errs?.length) for (const e of errs) log.warn(`${prod.handle} link: ${e.message}`);
    }

    log.info(
      `${prod.handle}: replaced ${oldMediaIds.length} → ${newMedia.length} media, ${variantMedia.length} variant links`
    );
    return true;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const handoffDir =
    process.env.HANDOFF_DIR ??
    `${process.env.HOME}/Downloads/shopify-handoff`;
  let products = loadProducts(handoffDir);
  if (only) products = products.filter((p) => p.handle === only);

  log.info(
    `Upscaling ${SCALE}x + re-uploading ${products.length} product(s)…`
  );
  let ok = 0;
  for (const prod of products) {
    try {
      if (await reuploadProduct(prod)) ok++;
    } catch (err) {
      log.error(`${prod.handle}: ${(err as Error).message}`);
    }
  }
  log.info(`Done — ${ok}/${products.length} products re-uploaded`);
}

main().catch((e) => {
  log.error(`Fatal: ${e.message}`);
  process.exit(1);
});
