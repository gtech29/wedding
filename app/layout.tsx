import type { Metadata } from "next";
import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/latin-400-italic.css";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "./globals.css";
import { getLocale } from "@/lib/i18n/server";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://sarahandjuan.com",
  ),
  title: {
    default: "Sarah and Juan | August 27, 2027",
    template: "%s | Sarah and Juan",
  },
  description:
    "Join Sarah and Juan for their wedding at Siempre Valle in Valle de Guadalupe, Baja California. August 27, 2027.",
  openGraph: {
    type: "website",
    siteName: "Sarah and Juan",
    title: "Sarah and Juan | August 27, 2027",
    description: "A celebration in Valle de Guadalupe. August 27, 2027.",
    locale: "en_US",
    alternateLocale: "es_MX",
  },
  twitter: { card: "summary_large_image" },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
