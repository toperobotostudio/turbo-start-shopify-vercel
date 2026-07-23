"use client";

import { Button } from "@workspace/ui/components/button";
import Link from "next/link";

import { SearchProductGrid } from "./search-product-grid";
import { useSearchDefaults } from "./use-search-defaults";

export function SearchEmptyState() {
  const { collections, bestSellers, isLoading } = useSearchDefaults();

  return (
    <div className="flex flex-col gap-8 px-4 py-8 md:px-8">
      {collections.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-medium text-foreground text-xl tracking-[0.24px]">
            Popular Searches
          </h2>
          <div className="flex flex-wrap gap-2">
            {collections.map((collection) => (
              <Link
                className="rounded-md bg-muted px-3 py-1 text-foreground text-sm transition-colors hover:bg-muted/70"
                href={`/collections/${collection.handle}`}
                key={collection.id}
              >
                {collection.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-foreground text-xl tracking-[0.24px]">
            Best Sellers
          </h2>
          <Button asChild size="sm">
            <Link href="/collections">Shop All</Link>
          </Button>
        </div>
        <SearchProductGrid
          isLoading={isLoading}
          products={bestSellers}
          skeletonCount={4}
        />
      </section>
    </div>
  );
}
