"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { SearchEmptyState } from "./search-empty-state";
import { useSearch } from "./search-context";
import { SearchResults } from "./search-results";
import { useProductSearch } from "./use-product-search";

export function SearchOverlay() {
  const { isSearchOpen, closeSearch } = useSearch();
  const {
    query,
    setQuery,
    products,
    collections,
    related,
    isSearching,
    hasQuery,
  } = useProductSearch();

  // Close the overlay whenever the route changes (e.g. clicking a result).
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      closeSearch();
    }
  }, [pathname, closeSearch]);

  // Focus the input when the overlay opens.
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isSearchOpen) {
      inputRef.current?.focus();
    }
  }, [isSearchOpen]);

  return (
    <Sheet onOpenChange={(open) => !open && closeSearch()} open={isSearchOpen}>
      <SheetContent
        className="h-dvh w-full gap-0 border-none p-0 sm:max-w-none"
        showCloseButton={false}
        side="bottom"
      >
        <SheetTitle className="sr-only">Search</SheetTitle>
        <SheetDescription className="sr-only">
          Search products and collections
        </SheetDescription>

        <div className="flex items-center gap-4 border-b px-4 py-4 md:px-8">
          <input
            className="flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Start typing to search…"
            ref={inputRef}
            type="text"
            value={query}
          />
          <button
            className="inline-flex items-center gap-1 text-base text-foreground tracking-[0.24px] transition-opacity hover:opacity-70"
            onClick={closeSearch}
            type="button"
          >
            Close
            <X className="size-[18px]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-muted/30">
          {hasQuery ? (
            <SearchResults
              collections={collections}
              isSearching={isSearching}
              onSelectTerm={setQuery}
              products={products}
              query={query}
              related={related}
            />
          ) : (
            <SearchEmptyState />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
