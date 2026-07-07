"use client";

import { Search } from "lucide-react";

import { useSearch } from "./search-context";

export function SearchToggle() {
  const { openSearch } = useSearch();

  return (
    <button
      aria-label="Search"
      className="inline-flex size-9 items-center justify-center rounded-md transition-colors hover:text-foreground"
      onClick={openSearch}
      type="button"
    >
      <Search className="size-4" />
    </button>
  );
}
