import { storefrontQuery } from "@/lib/shopify/client";
import { collectionProductToCardProps } from "@/lib/shopify/product-card";
import type { ShopifyCollectionProduct } from "@/lib/shopify/types";
import { ProductCard } from "./product-card";

const RELATED_PRODUCTS_QUERY = /* graphql */ `
  query RelatedProducts($productId: ID!) {
    productRecommendations(productId: $productId) {
      id
      handle
      title
      vendor
      productType
      tags
      options {
        id
        name
        values
      }
      featuredImage {
        url
        altText
        width
        height
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
        maxVariantPrice {
          amount
          currencyCode
        }
      }
      compareAtPriceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      variants(first: 100) {
        edges {
          node {
            id
            availableForSale
            quantityAvailable
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
  }
`;

type RelatedProductsResponse = {
  productRecommendations: ShopifyCollectionProduct[];
};

type RelatedProductsProps = {
  productId: string;
};

export async function RelatedProducts({ productId }: RelatedProductsProps) {
  const result = await storefrontQuery<RelatedProductsResponse>(
    RELATED_PRODUCTS_QUERY,
    { variables: { productId } }
  );

  if (!result.ok) return null;

  const products = result.data.productRecommendations.slice(0, 4);

  if (products.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="mb-6 font-medium font-(family-name:--font-geist-pixel-square) text-3xl">
        Related Products
      </h2>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            {...collectionProductToCardProps(product)}
          />
        ))}
      </div>
    </section>
  );
}
