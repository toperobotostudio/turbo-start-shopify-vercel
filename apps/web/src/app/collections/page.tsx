import { sanityFetch } from "@workspace/sanity/live";
import {
  queryAllCollections,
  queryCollectionsIndexPageData,
} from "@workspace/sanity/query";

import { CollectionsContent } from "@/components/collections/collections-content";
import { getSEOMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const { data } = await sanityFetch({
    query: queryCollectionsIndexPageData,
  });

  return getSEOMetadata({
    title: data?.seoTitle ?? data?.title ?? "Collections",
    description:
      data?.seoDescription ?? data?.subtitle ?? "Browse all collections",
    slug: "/collections",
  });
}

export default async function CollectionsPage() {
  const [{ data: indexData }, { data: collections }] = await Promise.all([
    sanityFetch({ query: queryCollectionsIndexPageData }),
    sanityFetch({ query: queryAllCollections }),
  ]);

  return (
    <CollectionsContent
      collections={collections ?? []}
      subtitle={indexData?.subtitle ?? null}
      title={indexData?.title ?? "Collections"}
    />
  );
}
