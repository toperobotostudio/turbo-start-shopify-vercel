"use client";

import { Button } from "@workspace/ui/components/button";
import { Bookmark } from "lucide-react";
import Link from "next/link";

import { useSavedItems } from "./saved-items-context";

type SavedItemsToggleProps = {
  variant?: "icon" | "text";
};

export function SavedItemsToggle({ variant = "icon" }: SavedItemsToggleProps) {
  const { count } = useSavedItems();

  if (variant === "text") {
    return (
      <Link
        aria-label={`Wishlist${count > 0 ? ` (${count} items)` : ""}`}
        className="text-foreground text-sm transition-colors hover:text-foreground/70"
        href="/saved"
      >
        Wishlist{count > 0 && ` (${count > 99 ? "99+" : count})`}
      </Link>
    );
  }

  return (
    <Button
      aria-label={`Saved items${count > 0 ? ` (${count} items)` : ""}`}
      asChild
      className="relative"
      size="icon"
      variant="ghost"
    >
      <Link href="/saved">
        <Bookmark className="size-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-primary-foreground text-xs font-medium">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    </Button>
  );
}
