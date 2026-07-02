import { ProductCard } from "@/components/product/product-card";
import { collectionProductToCardProps } from "@/lib/shopify/product-card";
import type { ShopifyCollectionProduct } from "@/lib/shopify/types";

type ProductGridProps = {
  products: ShopifyCollectionProduct[];
};

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        No products found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          {...collectionProductToCardProps(product)}
        />
      ))}
    </div>
  );
}
