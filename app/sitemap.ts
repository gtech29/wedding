import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "/our-story",
    "/travel",
    "/things-to-do",
    "/faq",
    "/gallery",
    "/honeymoon-fund",
  ].map((path) => ({ url: `https://sarahandjuan.com${path}` }));
}
