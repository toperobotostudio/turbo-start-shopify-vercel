import { NextResponse } from "next/server";

import { storefrontQuery } from "@/lib/shopify/client";
import { PREDICTIVE_SEARCH_QUERY } from "@/lib/shopify/queries";
import type { PredictiveSearchResponse } from "@/lib/shopify/types";

const LIMIT = 10;

const EMPTY = { products: [], collections: [], related: [] };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json(EMPTY);
  }

  const result = await storefrontQuery<PredictiveSearchResponse>(
    PREDICTIVE_SEARCH_QUERY,
    { variables: { query, limit: LIMIT } }
  );

  if (!result.ok) {
    return NextResponse.json(EMPTY);
  }

  const { products, collections, queries } = result.data.predictiveSearch;
  return NextResponse.json({
    products,
    collections,
    related: queries.map((q) => q.text),
  });
}
