import { Star } from "lucide-react";
import { defineField, defineType } from "sanity";

import { buttonsField, imageWithAltField } from "@/schemaTypes/common";
import { customRichText } from "@/schemaTypes/definitions/rich-text";

export const hero = defineType({
  name: "hero",
  title: "Hero",
  icon: Star,
  type: "object",
  description:
    "Eye-catching banner at the top of a page with a headline, description, image, and call-to-action buttons",
  fields: [
    defineField({
      name: "style",
      type: "string",
      title: "Hero style",
      description: "Layout variant for the hero section",
      options: {
        list: [
          { title: "Classic (two-column)", value: "classic" },
          { title: "Full bleed", value: "fullBleed" },
        ],
        layout: "radio",
      },
      initialValue: "classic",
    }),
    defineField({
      name: "badge",
      type: "string",
      title: "Badge",
      description:
        "Optional badge text displayed above the title, useful for highlighting new features or promotions",
    }),
    defineField({
      name: "title",
      type: "string",
      title: "Title",
      description:
        "The main heading text for the hero section that captures attention",
    }),
    customRichText(["block"]),
    imageWithAltField(),
    buttonsField,
  ],
  preview: {
    select: {
      title: "title",
      media: "image",
    },
    prepare: ({ title, media }) => ({
      title: title || "Untitled",
      subtitle: "Hero",
      media: media ?? Star,
    }),
  },
});
