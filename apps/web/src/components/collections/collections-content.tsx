"use client";

import type { QueryAllCollectionsResult } from "@workspace/sanity/types";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { CollectionCard } from "@/components/collection/collection-card";
import {
  CollectionsSortSelector,
  type SortOption,
  sortCollections,
} from "@/components/collections/collections-sort";
import { sanityCollectionToCardProps } from "@/lib/collection-card";

type CollectionsContentProps = {
  title: string;
  subtitle: string | null;
  collections: QueryAllCollectionsResult;
};

function CollectionsGrid({
  title,
  subtitle,
  collections,
}: CollectionsContentProps) {
  const searchParams = useSearchParams();
  const sort = (searchParams.get("sort") as SortOption) || "a-z";
  const sorted = sortCollections(collections, sort);

  return (
    <div className="site-container py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-medium text-2xl tracking-tight md:text-[32px]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <CollectionsSortSelector />
      </div>
      {sorted.length === 0 ? (
        <p className="text-muted-foreground">No collections found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-1 gap-y-10 md:grid-cols-3">
          {sorted.map((collection) => (
            <CollectionCard
              key={collection._id}
              {...sanityCollectionToCardProps(collection)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CollectionsContent(props: CollectionsContentProps) {
  return (
    <Suspense>
      <CollectionsGrid {...props} />
    </Suspense>
  );
}
