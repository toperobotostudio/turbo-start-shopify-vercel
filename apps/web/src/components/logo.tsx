import Link from "next/link";

import type { Maybe } from "@/types";

type LogoProps = {
  text?: Maybe<string>;
};

export function Logo({ text }: LogoProps) {
  return (
    <Link className="flex gap-2 items-center" href="/">
      {text && (
        <h1 className="whitespace-nowrap text-xl tracking-wide font-medium uppercase ">
          {text}
        </h1>
      )}
    </Link>
  );
}
