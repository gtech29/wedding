import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  MapPin,
  Wine,
  MoveUpRight,
} from "lucide-react";
import { getLocale } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { wedding } from "@/content/wedding";
import { Photo } from "@/components/wedding/Photo";
import { RsvpInvitation } from "@/components/wedding/RsvpInvitation";
export default async function Home() {
  const locale = await getLocale();
  const t = dictionaries[locale];
  return (
    <>
      <section className="hero">
        <div className="hero-heading">
          <p className="eyebrow">
            {t.home.eyebrow}
            <span className="tiny-star" aria-hidden="true">
              ✧
            </span>
            27.08.2027
          </p>
          <h1>
            Sarah <em>and</em> Juan<span className="hero-period">.</span>
          </h1>
          <div className="hero-bottom">
            <p>
              {t.common.date}
              <span>{t.common.location}</span>
              <span>SIEMPRE VALLE · MÉXICO</span>
            </p>
            <Link href="/rsvp" className="button button-primary">
              {t.common.rsvp}
              <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
        <div className="hero-photo-wrap">
          <Photo
            photo={wedding.heroPhoto}
            locale={locale}
            label={t.home.placeholder}
            className="hero-photo"
            sizes="(max-width: 650px) 100vw, 90vw"
            priority
          />
          <span className="hero-side-label" aria-hidden="true">
            VALLE DE GUADALUPE — 2027
          </span>
          <div className="photo-footnote">
            <span>{t.home.scroll}</span>
            <a href="#welcome" aria-label={t.common.explore}>
              <ArrowDown size={17} />
            </a>
          </div>
        </div>
      </section>
      <section id="welcome" className="welcome-section section-shell">
        <div>
          <p className="eyebrow">{t.home.invitation}</p>
          <h2>{t.home.intro}</h2>
        </div>
        <div className="welcome-copy">
          <span className="four-point-star" aria-hidden="true">
            ✧
          </span>
          <p>{t.home.welcome}</p>
          <Link href="/our-story" className="text-link">
            {t.home.welcomeLink}
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
      <section className="venue-section section-shell">
        <div className="venue-photo">
          <Photo
            photo={wedding.venuePhoto}
            locale={locale}
            label={t.common.photo}
            variant="portrait"
          />
          <span className="venue-caption">01 / SIEMPRE VALLE</span>
        </div>
        <div className="venue-copy">
          <p className="eyebrow">{t.home.locationLabel}</p>
          <h2>{t.home.venueTitle}</h2>
          <p>{t.home.venueText}</p>
          <div className="venue-details">
            <div>
              <MapPin size={18} strokeWidth={1.2} />
              <p>
                Siempre Valle<span>{t.common.location}</span>
              </p>
            </div>
            <div>
              <span className="venue-date" aria-hidden="true">
                27
              </span>
              <p>
                {t.common.date}
                <span>{wedding.ceremonyTime?.[locale] || t.home.time}</span>
              </p>
            </div>
          </div>
          <Link href="/travel" className="text-link">
            {t.home.venueLink}
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
      <section className="details-section section-shell">
        <p className="eyebrow">{t.home.detailsLabel}</p>
        <h2>{t.home.detailTitle}</h2>
        <div className="detail-cards">
          {[
            {
              href: "/travel",
              title: t.nav.travel,
              text: t.home.travelText,
              icon: <MapPin />,
            },
            {
              href: "/things-to-do",
              title: t.nav.things,
              text: t.home.thingsText,
              icon: <Wine />,
            },
            {
              href: "/faq",
              title: t.nav.faq,
              text: t.home.faqText,
              icon: <span className="serif">?</span>,
            },
          ].map((card, i) => (
            <Link href={card.href} className="detail-card" key={card.href}>
              <div className="detail-card-top">
                <span>0{i + 1}</span>
                {card.icon}
              </div>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
              <MoveUpRight className="card-arrow" size={20} />
            </Link>
          ))}
        </div>
      </section>
      <RsvpInvitation t={t} />
    </>
  );
}
