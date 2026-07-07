"use client";

import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";
import { useState } from "react";

import { CollectionCard } from "@/components/collection/collection-card";
import { shopifyCollectionToCardProps } from "@/lib/collection-card";
import type {
  ShopifyCollectionLite,
  ShopifyCollectionProduct,
} from "@/lib/shopify/types";
import { SearchProductGrid } from "./search-product-grid";

type Tab = "products" | "collections";

type SearchResultsProps = {
  query: string;
  related: string[];
  products: ShopifyCollectionProduct[];
  collections: ShopifyCollectionLite[];
  isSearching: boolean;
  onSelectTerm: (term: string) => void;
};

function CollectionsGrid({
  collections,
  isLoading,
}: {
  collections: ShopifyCollectionLite[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
        {["a", "b", "c"].map((key) => (
          <div className="flex flex-col gap-2" key={key}>
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (collections.length === 0) {
    return <p className="py-8 text-muted-foreground">No collections found.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
      {collections.map((collection) => (
        <CollectionCard
          key={collection.id}
          {...shopifyCollectionToCardProps(collection)}
        />
      ))}
    </div>
  );
}

export function SearchResults({
  query,
  related,
  products,
  collections,
  isSearching,
  onSelectTerm,
}: SearchResultsProps) {
  const [tab, setTab] = useState<Tab>("products");

  const tabClass = (active: boolean) =>
    cn(
      "pb-2 font-medium text-xl tracking-[0.24px] transition-colors",
      active
        ? "border-foreground border-b-2 text-foreground"
        : "text-muted-foreground hover:text-foreground"
    );

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {related.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-medium text-foreground text-xl tracking-[0.24px]">
            Related
          </h2>
          <div className="flex flex-wrap gap-2">
            {related.map((term) => (
              <button
                className="rounded-md bg-muted px-3 py-1 text-foreground text-sm transition-colors hover:bg-muted/70"
                key={term}
                onClick={() => onSelectTerm(term)}
                type="button"
              >
                {term}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center justify-between border-b">
        <div className="flex gap-6">
          <button
            className={tabClass(tab === "products")}
            onClick={() => setTab("products")}
            type="button"
          >
            Products [{products.length}]
          </button>
          <button
            className={tabClass(tab === "collections")}
            onClick={() => setTab("collections")}
            type="button"
          >
            Collections [{collections.length}]
          </button>
        </div>
        <Button asChild className="mb-2" size="sm">
          <Link href={`/search?q=${encodeURIComponent(query)}`}>Shop All</Link>
        </Button>
      </div>

      {tab === "products" ? (
        <SearchProductGrid isLoading={isSearching} products={products} />
      ) : (
        <CollectionsGrid collections={collections} isLoading={isSearching} />
      )}
    </div>
  );
}
