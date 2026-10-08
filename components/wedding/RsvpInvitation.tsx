import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
export function RsvpInvitation({ t }: { t: Dictionary }) {
  return (
    <section className="rsvp-invitation">
      <div className="rsvp-invitation-photo" aria-hidden="true">
        <Image
          src="/images/rsvp.jpg"
          alt=""
          fill
          sizes="(max-width: 980px) 100vw, 50vw"
        />
      </div>
      <div className="rsvp-invitation-copy">
        <p className="eyebrow">{t.home.rsvpEyebrow}</p>
        <h2>{t.home.rsvpTitle}</h2>
        <p>{t.home.rsvpText}</p>
        <Link href="/rsvp" className="button button-primary">
          {t.common.rsvp}
          <ArrowUpRight size={17} />
        </Link>
        <span className="rsvp-decoration" aria-hidden="true" />
      </div>
    </section>
  );
}
