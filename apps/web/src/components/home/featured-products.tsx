import { Button } from "@workspace/ui/components/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import {
  ProductCard,
  type StockStatus,
} from "@/components/product/product-card";
import { storefrontQuery } from "@/lib/shopify/client";
import { getColorHex } from "@/lib/shopify/color";
import { getCardOptions } from "@/lib/shopify/options";
import {
  badgeFromTags,
  secondaryImageUrl,
} from "@/lib/shopify/product-card";
import { FEATURED_PRODUCTS_QUERY } from "@/lib/shopify/queries";
import {
  type FeaturedProduct,
  type FeaturedProductsResponse,
  LOW_STOCK_THRESHOLD,
} from "@/lib/shopify/types";

/** Fetches featured products from Shopify Storefront API. */
async function getFeaturedProducts(): Promise<FeaturedProduct[]> {
  const result = await storefrontQuery<FeaturedProductsResponse>(
    FEATURED_PRODUCTS_QUERY,
    { variables: { first: 8 } }
  );

  if (!result.ok) return [];
  return result.data.products.edges.map((edge) => edge.node);
}

function featuredStock(product: FeaturedProduct): StockStatus {
  if (!product.availableForSale) return "out";
  if (
    product.totalInventory !== null &&
    product.totalInventory > 0 &&
    product.totalInventory <= LOW_STOCK_THRESHOLD
  ) {
    return "low";
  }
  return null;
}

export async function FeaturedProducts() {
  const products = await getFeaturedProducts();

  if (products.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-20 md:px-6 md:py-28">
      <div className="mb-12 flex items-end justify-between md:mb-16">
        <div>
          <h2 className="font-light font-(family-name:--font-geist-pixel-square) text-3xl tracking-tight md:text-4xl">
            Featured Products
          </h2>
        </div>
        <Button asChild size="lg">
          <Link href="/collections/all-products">
            See all
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-8">
        {products.map((product) => {
          const { colors: colorNames, sizes } = getCardOptions(product.options);
          const colors = colorNames.map((name) => ({
            name,
            hex: getColorHex(name),
          }));
          return (
            <ProductCard
              badge={badgeFromTags(product.tags)}
              colors={colors}
              compareAtPrice={
                product.compareAtPriceRange
                  ? Number(product.compareAtPriceRange.minVariantPrice.amount)
                  : null
              }
              currencyCode={product.priceRange.minVariantPrice.currencyCode}
              imageUrl={product.featuredImage?.url ?? null}
              key={product.id}
              secondaryImageUrl={secondaryImageUrl(
                product.images,
                product.featuredImage?.url ?? null
              )}
              priceRange={{
                minVariantPrice: Number(
                  product.priceRange.minVariantPrice.amount
                ),
                maxVariantPrice: Number(
                  product.priceRange.maxVariantPrice.amount
                ),
              }}
              selectedColor={colorNames[0]}
              selectedSize={sizes[0]}
              sizes={sizes}
              slug={product.handle}
              stockStatus={featuredStock(product)}
              title={product.title}
              variantName={colorNames[0]}
              variants={product.variants.edges.map((edge) => edge.node)}
              vendor={product.vendor}
            />
          );
        })}
      </div>

      <div className="mt-10 text-center md:hidden">
        <Button asChild>
          <Link href="/collections">View All</Link>
        </Button>
      </div>
    </section>
  );
}
