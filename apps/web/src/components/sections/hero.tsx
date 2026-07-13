import Link from "next/link";

import type {
  SanityButtonProps,
  SanityImageProps,
  SanityRichTextProps,
} from "@/types";
import { RichText } from "../elements/rich-text";
import { SanityImage } from "../elements/sanity-image";

type HeroBlockProps = {
  _key: string;
  _type: "hero";
  badge?: string | null;
  title?: string | null;
  richText?: SanityRichTextProps | null;
  image?: SanityImageProps | null;
  buttons?: SanityButtonProps[] | null;
};

export function HeroBlock({ title, buttons, image, richText }: HeroBlockProps) {
  return (
    <section className="relative" id="hero">
      <div className="card-surface relative h-[72vh] min-h-125 w-full overflow-hidden">
        {image && (
          <SanityImage
            className="absolute inset-0 h-full w-full min-h-full rounded-none object-cover"
            fetchPriority="high"
            image={image}
            loading="eager"
            sizes="100vw"
            width={2000}
          />
        )}

        {/* Promo text overlaid bottom-left */}
        <div className="absolute inset-x-0 bottom-0">
          <div className="container mx-auto px-4 pb-8 md:px-6 md:pb-12">
            <div className="flex max-w-md flex-col items-start gap-2 font-medium text-zinc-900">
              <div className="text-2xl leading-tight">
                {title && <p>{title}</p>}
                {buttons?.map((button) =>
                  button.href ? (
                    <Link
                      className="block w-fit hover:underline"
                      href={button.href}
                      key={button._key}
                      target={button.openInNewTab ? "_blank" : "_self"}
                    >
                      {button.text}
                    </Link>
                  ) : null
                )}
              </div>
              {richText && (
                <RichText className="text-sm text-zinc-800" richText={richText} />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
