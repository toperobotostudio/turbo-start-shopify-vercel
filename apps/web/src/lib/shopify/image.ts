/** Small Shopify CDN variant used as a blur-up placeholder source. */
export function shopifyLoResUrl(url: string, width = 24): string {
  try {
    const u = new URL(url); // Shopify URLs already carry ?v=<hash>; keep it.
    u.searchParams.set("width", String(width));
    return u.toString();
  } catch {
    return url; // Non-absolute src (shouldn't happen for Shopify CDN) — no-op.
  }
}
