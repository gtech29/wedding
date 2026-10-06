import { getLocale } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { Header } from "@/components/wedding/Header";
import { Footer } from "@/components/wedding/Footer";
export default async function WeddingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const t = dictionaries[locale];
  return (
    <>
      <a className="skip-link" href="#main">
        {t.common.skip}
      </a>
      <Header locale={locale} t={t} />
      <main id="main">{children}</main>
      <Footer t={t} />
    </>
  );
}
