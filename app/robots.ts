import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/rsvp", "/api/"],
    },
    sitemap: "https://sarahandjuan.com/sitemap.xml",
  };
}
