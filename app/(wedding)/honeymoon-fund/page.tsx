import { ArrowUpRight } from "lucide-react";
import { getLocale } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { wedding } from "@/content/wedding";
import { PageIntro } from "@/components/wedding/PageIntro";
import { Monogram } from "@/components/wedding/Monogram";
import { localizedMetadata } from "@/lib/i18n/metadata";
export const generateMetadata = () => localizedMetadata("fund");
export default async function Fund() {
  const locale = await getLocale();
  const t = dictionaries[locale];
  const url = wedding.honeymoon.url;
  return (
    <>
      <PageIntro
        {...t.fund}
        intro={wedding.honeymoon.message?.[locale] || t.fund.intro}
      />
      <div className="page-body fund-body">
        <div className="fund-art">
          <Monogram />
        </div>
        {url && url.startsWith("https://") ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="button button-primary"
          >
            {t.fund.button}
            <ArrowUpRight size={17} />
          </a>
        ) : (
          <p className="coming-note">{t.fund.pending}</p>
        )}
        <p className="fund-thanks">{t.fund.thanks}</p>
      </div>
    </>
  );
}
