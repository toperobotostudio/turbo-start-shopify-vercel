"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Minus, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

import type { PagebuilderType } from "@/types";
import { RichText } from "../elements/rich-text";
import { FaqJsonLd } from "../json-ld";

type FaqCategoriesProps = PagebuilderType<"faqCategories">;

const listVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
};

export function FaqCategories({ title, categories }: FaqCategoriesProps) {
  const groups = categories ?? [];
  const allFaqs = groups.flatMap((category) => category?.faqs ?? []);
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="my-8 md:my-20" id="faq">
      <FaqJsonLd faqs={allFaqs} />
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="mb-8 font-medium text-2xl md:mb-12 md:text-3xl">
          {title}
        </h2>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-16">
          {/* Left rail — clickable category tabs */}
          <div
            aria-label="FAQ categories"
            aria-orientation="vertical"
            className="flex flex-col gap-2 self-start md:sticky md:top-24"
            role="tablist"
          >
            {groups.map((category, index) => (
              <button
                aria-controls={`faq-panel-${category?._key}`}
                aria-selected={index === activeIndex}
                className={cn(
                  "text-left text-sm tracking-wide transition-colors",
                  index === activeIndex
                    ? "font-medium text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
                id={`faq-tab-${category?._key}`}
                key={category?._key}
                onClick={() => setActiveIndex(index)}
                role="tab"
                type="button"
              >
                {category?.title}
              </button>
            ))}
          </div>

          {/* Right column — every category stays in the DOM (SEO); only the
              active one is visible, and its items stagger in on switch */}
          <div>
            {groups.map((category, index) => {
              const isActive = index === activeIndex;
              return (
                <motion.div
                  animate={isActive ? "show" : "hidden"}
                  aria-labelledby={`faq-tab-${category?._key}`}
                  hidden={!isActive}
                  id={`faq-panel-${category?._key}`}
                  initial="hidden"
                  key={category?._key}
                  role="tabpanel"
                  variants={listVariants}
                >
                  <motion.p
                    className="mb-6 text-sm text-zinc-800 dark:text-zinc-200"
                    variants={itemVariants}
                  >
                    {category?.title}
                  </motion.p>

                  <div className="flex flex-col">
                    {(category?.faqs ?? []).map((faq, faqIndex) => (
                      <motion.details
                        className="group border-zinc-200 border-b first:border-t dark:border-zinc-800"
                        key={faq?._id}
                        open={faqIndex === 0}
                        variants={itemVariants}
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm text-zinc-900 marker:hidden dark:text-zinc-100 [&::-webkit-details-marker]:hidden">
                          <span>{faq?.title}</span>
                          <span className="shrink-0 text-zinc-500">
                            <Plus className="size-4 group-open:hidden" />
                            <Minus className="hidden size-4 group-open:block" />
                          </span>
                        </summary>
                        <RichText
                          className="pb-6 text-sm text-zinc-950 dark:text-zinc-50"
                          richText={faq?.richText ?? []}
                        />
                      </motion.details>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
