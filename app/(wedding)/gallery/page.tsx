import { getLocale } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { galleryPhotos } from "@/content/wedding";
import { PageIntro } from "@/components/wedding/PageIntro";
import { Gallery } from "@/components/wedding/Gallery";
import { localizedMetadata } from "@/lib/i18n/metadata";
export const generateMetadata = () => localizedMetadata("gallery");
export default async function GalleryPage() {
  const locale = await getLocale();
  const t = dictionaries[locale];
  return (
    <>
      <PageIntro {...t.gallery} />
      <div className="page-body">
        <Gallery photos={galleryPhotos} locale={locale} t={t} />
      </div>
    </>
  );
}
