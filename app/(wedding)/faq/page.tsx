import { Plus } from "lucide-react";
import { getLocale } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { faqs } from "@/content/wedding";
import { PageIntro } from "@/components/wedding/PageIntro";
import { localizedMetadata } from "@/lib/i18n/metadata";
export const generateMetadata = () => localizedMetadata("faq");
export default async function Faq() {
  const locale = await getLocale();
  const t = dictionaries[locale];
  return (
    <>
      <PageIntro {...t.faq} />
      <div className="page-body faq-body">
        {faqs.map((f) => (
          <details key={f.id} className="faq-item">
            <summary>
              {f.question[locale]}
              <Plus aria-hidden="true" />
            </summary>
            <p className="faq-answer">{f.answer[locale]}</p>
          </details>
        ))}
        <p className="faq-more">{t.faq.pending}</p>
        <p className="contact-note">{t.faq.contact}</p>
      </div>
    </>
  );
}
