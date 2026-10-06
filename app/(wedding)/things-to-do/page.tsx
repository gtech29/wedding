import { getLocale } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { recommendations } from "@/content/wedding";
import { PageIntro } from "@/components/wedding/PageIntro";
import { Monogram } from "@/components/wedding/Monogram";
import { Photo } from "@/components/wedding/Photo";
import { localizedMetadata } from "@/lib/i18n/metadata";
export const generateMetadata = () => localizedMetadata("things");
export default async function Things() {
  const locale = await getLocale();
  const t = dictionaries[locale];
  return (
    <>
      <PageIntro {...t.things} />
      <div className="page-body">
        <div className="category-labels">
          {t.things.categories.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        {recommendations.length === 0 ? (
          <div className="empty-editorial">
            <Monogram />
            <h2>{t.things.pending}</h2>
            <p>{t.things.pendingText}</p>
          </div>
        ) : (
          <div className="recommendations">
            {recommendations.map((r) => (
              <article key={r.id} className="recommendation">
                {r.photo && (
                  <Photo
                    photo={r.photo}
                    locale={locale}
                    label={t.common.photo}
                  />
                )}
                <h2>{r.name}</h2>
                <p>{r.description[locale]}</p>
                {r.address && <p>{r.address}</p>}
                {r.note && <p>{r.note[locale]}</p>}
                <div className="recommendation-links">
                  {r.websiteUrl && (
                    <a
                      className="text-link"
                      href={r.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t.things.website} ↗
                    </a>
                  )}
                  {r.mapUrl && (
                    <a
                      className="text-link"
                      href={r.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t.things.map} ↗
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
