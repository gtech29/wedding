import { getLocale } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { wedding, travelSections } from "@/content/wedding";
import { PageIntro } from "@/components/wedding/PageIntro";
import { Photo } from "@/components/wedding/Photo";
import { localizedMetadata } from "@/lib/i18n/metadata";
export const generateMetadata = () => localizedMetadata("travel");
export default async function Travel() {
  const locale = await getLocale();
  const t = dictionaries[locale];
  return (
    <>
      <PageIntro {...t.travel} />
      <div className="page-body">
        <section className="travel-venue">
          <Photo
            photo={wedding.venuePhoto}
            locale={locale}
            label={t.common.photo}
          />
          <div className="travel-venue-copy">
            <p className="eyebrow">{t.travel.venue}</p>
            <h2>Siempre Valle</h2>
            <p>{t.travel.venueText}</p>
            <p>{t.common.date}</p>
          </div>
        </section>
        <div className="travel-sections">
          {travelSections
            .filter((s) => s.enabled)
            .map((s, i) => (
              <section className="travel-section" key={s.id}>
                <span className="eyebrow">0{i + 1}</span>
                <h2>{s.title[locale]}</h2>
                {s.body?.[locale] &&
                  s.body[locale]
                    .split("\n\n")
                    .map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {s.pending && (
                  <div className="travel-pending">
                    <h3>{t.travel.pendingLabel}</h3>
                    <p>{s.pending[locale]}</p>
                  </div>
                )}
                {s.links && (
                  <ul className="travel-links">
                    {s.links.map((link) => (
                      <li key={link.url}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-link"
                        >
                          {link.label[locale]} <span aria-hidden="true">↗</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                {s.url && s.linkLabel && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button button-outline travel-directions"
                  >
                    {s.linkLabel[locale]} ↗
                  </a>
                )}
              </section>
            ))}
        </div>
      </div>
    </>
  );
}
