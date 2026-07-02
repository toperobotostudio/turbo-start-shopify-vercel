"use client";

import { cn } from "@workspace/ui/lib/utils";

import { getColorHex } from "@/lib/shopify/color";

type ColorSwatchProps = {
  values: string[];
  selectedValue: string;
  availability: Record<string, boolean>;
  onSelect: (value: string) => void;
};

export function ColorSwatch({
  values,
  selectedValue,
  availability,
  onSelect,
}: ColorSwatchProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => {
        const hex = getColorHex(value);
        const isAvailable = availability[value] !== false;
        const isSelected = selectedValue === value;

        if (!hex) {
          // Fallback to text button if no matching color
          return (
            <button
              className={cn(
                "border px-4 py-2 text-sm transition-colors",
                isSelected
                  ? "border-foreground text-foreground"
                  : "border-border text-foreground hover:border-foreground/50",
                !isAvailable && "opacity-40"
              )}
              key={value}
              onClick={() => onSelect(value)}
              title={value}
              type="button"
            >
              {value}
            </button>
          );
        }

        return (
          <button
            className={cn(
              "relative size-10 rounded-full border transition-all",
              isSelected
                ? "border-foreground ring-1 ring-foreground/80 ring-offset-2 ring-offset-background"
                : "border-border hover:border-foreground/50",
              !isAvailable && "opacity-40"
            )}
            key={value}
            onClick={() => onSelect(value)}
            style={{ backgroundColor: hex }}
            title={value}
            type="button"
          >
            <span className="sr-only">{value}</span>
          </button>
        );
      })}
    </div>
  );
}
