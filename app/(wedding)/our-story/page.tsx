import { getLocale } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { wedding, galleryPhotos } from "@/content/wedding";
import { PageIntro } from "@/components/wedding/PageIntro";
import { Photo } from "@/components/wedding/Photo";
import { localizedMetadata } from "@/lib/i18n/metadata";
export const generateMetadata = () => localizedMetadata("story");
export default async function Story() {
  const locale = await getLocale();
  const t = dictionaries[locale];
  return (
    <>
      <PageIntro {...t.story} />
      <div className="page-body">
        <div className="story-editorial">
          <Photo
            photo={galleryPhotos[0]}
            locale={locale}
            label={t.common.engagement}
            variant="portrait"
          />
          <div className="story-copy">
            <p className="eyebrow">S&amp;J</p>
            <h2>{t.story.label}</h2>
            <p className={wedding.story.body ? "" : "coming-note"}>
              {wedding.story.body?.[locale] || t.story.pending}
            </p>
          </div>
        </div>
        {wedding.story.milestones.length > 0 && (
          <section className="milestones">
            <h2>{t.story.milestone}</h2>
            {wedding.story.milestones.map((m) => (
              <div key={m.date} className="milestone-item">
                <p className="eyebrow">{m.date}</p>
                <h3>{m.title[locale]}</h3>
                <p>{m.body[locale]}</p>
              </div>
            ))}
          </section>
        )}
      </div>
    </>
  );
}
