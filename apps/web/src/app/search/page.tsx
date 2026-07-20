import { SearchPageContent } from "@/components/search/search-page-content";
import { getSEOMetadata } from "@/lib/seo";

export function generateMetadata() {
  return getSEOMetadata({
    title: "Search",
    description: "Search our products",
    slug: "/search",
    seoNoIndex: true,
  });
}

type PageProps = {
  searchParams: Promise<Record<string, string>>;
};

export default async function SearchPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const query = sp.q?.trim() ?? "";

  return (
    <div className="container mx-auto flex w-full flex-col px-4 py-12 md:px-6 md:py-20">
      <SearchPageContent initialQuery={query} />
    </div>
  );
}
