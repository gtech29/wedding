import type { Metadata } from "next";
import { getLocale } from "./server";
import { dictionaries } from "./dictionaries";

type PageKey =
  "story" | "things" | "travel" | "faq" | "fund" | "gallery" | "rsvp";
export async function localizedMetadata(page: PageKey): Promise<Metadata> {
  const locale = await getLocale();
  const t = dictionaries[locale];
  return {
    title: t.nav[page],
    description: t[page].intro,
    ...(page === "rsvp" ? { robots: { index: false, follow: false } } : {}),
  };
}
