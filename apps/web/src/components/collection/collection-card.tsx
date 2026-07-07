import Image from "next/image";
import Link from "next/link";

export type CollectionCardProps = {
  handle: string;
  title: string;
  imageUrl: string | null;
  description?: string | null;
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
}: CollectionCardProps) {
  const plainDescription = description ? stripHtml(description) : null;
  return (
    <Link
      className="group block overflow-hidden"
      href={`/collections/${handle}`}
    >
      <div className="card-surface relative aspect-square overflow-hidden">
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

        {/* "View Collection" bar — fades in on hover (mirrors the product card's add-to-cart bar). */}
        <div className="absolute inset-x-2 bottom-2 z-10 flex items-center justify-center bg-background p-2 opacity-0 transition-opacity duration-200 md:group-hover:opacity-100">
          <span className="font-medium text-foreground text-sm">
            View Collection
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2 py-4">
        <h2 className="font-medium text-sm md:text-xl">{title}</h2>
        {plainDescription ? (
          <p className="line-clamp-2 text-muted-foreground text-xs">
            {plainDescription}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
