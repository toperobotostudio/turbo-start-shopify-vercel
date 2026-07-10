"use client";

import { Minus, Plus } from "lucide-react";

type QuantitySelectorProps = {
  value: number;
  onChange: (value: number) => void;
  /** Upper bound (e.g. available inventory). Omitted = no cap. */
  max?: number | null;
  disabled?: boolean;
};

export function QuantitySelector({
  value,
  onChange,
  max,
  disabled,
}: QuantitySelectorProps) {
  const canDecrement = !disabled && value > 1;
  const canIncrement =
    !disabled && (max === null || max === undefined || value < max);

  const stepButton =
    "flex items-center justify-center text-foreground transition-colors hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-40";

  return (
    <div className="flex h-9 items-center gap-4 border border-border px-2">
      <button
        aria-label="Decrease quantity"
        className={stepButton}
        disabled={!canDecrement}
        onClick={() => onChange(value - 1)}
        type="button"
      >
        <Minus className="size-4" />
      </button>
      <span
        aria-live="polite"
        className="min-w-4 text-center text-base tabular-nums"
      >
        {value}
      </span>
      <button
        aria-label="Increase quantity"
        className={stepButton}
        disabled={!canIncrement}
        onClick={() => onChange(value + 1)}
        type="button"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
