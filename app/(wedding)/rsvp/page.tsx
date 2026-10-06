import { getLocale } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { RsvpFlow } from "@/components/rsvp/RsvpFlow";
import { localizedMetadata } from "@/lib/i18n/metadata";
export const generateMetadata = () => localizedMetadata("rsvp");
export const dynamic = "force-dynamic";
export default async function RsvpPage() {
  const locale = await getLocale();
  return <RsvpFlow locale={locale} t={dictionaries[locale]} />;
}
