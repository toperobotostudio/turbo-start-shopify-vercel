import { formatMoney, getDiscountPercent } from "@/lib/shopify/money";
import type { MoneyV2 } from "@/lib/shopify/types";

type PriceDisplayProps = {
  price: MoneyV2;
  compareAtPrice: MoneyV2 | null;
};

export function PriceDisplay({ price, compareAtPrice }: PriceDisplayProps) {
  const savePercent = getDiscountPercent(price, compareAtPrice);
  const isOnSale = savePercent > 0;

  return (
    <div className="flex flex-col gap-2">
      {isOnSale && savePercent > 0 && (
        <span className="inline-block w-fit bg-red-600 px-2 py-1 text-sm text-white uppercase">
          Save {savePercent}%
        </span>
      )}
      <div className="flex items-center gap-3">
        <span className="text-xl">{formatMoney(price)}</span>
        {isOnSale && compareAtPrice && (
          <span className="text-base text-muted-foreground line-through">
            {formatMoney(compareAtPrice)}
          </span>
        )}
      </div>
    </div>
  );
}
