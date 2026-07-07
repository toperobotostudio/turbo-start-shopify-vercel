import { cn } from "@workspace/ui/lib/utils";
import Image from "next/image";
import Link from "next/link";

type CollectionCardProps = {
  handle: string;
  title: string;
  imageUrl: string | null;
  description?: string | null;
  /** Show a "View Collection" bar that fades in on hover (mirrors the product card's add-to-cart bar). */
  showViewButton?: boolean;
};

/** Strips HTML tags from a string. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export function CollectionCard({
  handle,
  title,
  imageUrl,
  description,
  showViewButton,
}: CollectionCardProps) {
  const plainDescription = description ? stripHtml(description) : null;
  return (
    <Link
      className="group block overflow-hidden bg-card"
      href={`/collections/${handle}`}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {imageUrl ? (
          <Image
            alt={title}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            src={imageUrl}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            No image
          </div>
        )}

        {showViewButton && (
          <div className="absolute inset-x-2 bottom-2 z-10 flex items-center justify-center bg-background p-2 opacity-0 transition-opacity duration-200 md:group-hover:opacity-100">
            <span className="font-medium text-foreground text-sm">
              View Collection
            </span>
          </div>
        )}
      </div>
      <div className="py-4 flex flex-col gap-2">
        <h2
          className={cn(
            "font-medium text-sm md:text-xl",
            !showViewButton && "group-hover:underline"
          )}
        >
          {title}
        </h2>
        {plainDescription ? (
          <p className=" line-clamp-2 text-muted-foreground text-xs">
            {plainDescription}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
