"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { Monogram } from "./Monogram";
import { LanguageToggle } from "./LanguageToggle";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";
export function Header({ locale, t }: { locale: Locale; t: Dictionary }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const links = [
    ["/", t.nav.home],
    ["/our-story", t.nav.story],
    ["/things-to-do", t.nav.things],
    ["/travel", t.nav.travel],
    ["/faq", t.nav.faq],
    ["/honeymoon-fund", t.nav.fund],
    ["/gallery", t.nav.gallery],
  ];
  return (
    <header className="site-header">
      <Link
        href="/"
        className="brand"
        aria-label={
          locale === "en" ? "Sarah and Juan — home" : "Sarah and Juan — inicio"
        }
      >
        <Monogram />
      </Link>
      <div className="desktop-nav-center">
        <nav
          className="desktop-nav"
          aria-label={
            locale === "en" ? "Main navigation" : "Navegación principal"
          }
        >
          {links.slice(1).map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="nav-actions">
        <LanguageToggle locale={locale} label={t.common.language} />
        <Link href="/rsvp" className="nav-rsvp" aria-label={t.nav.rsvp}>
          <span className="nav-rsvp-label">{t.nav.rsvp}</span>
          <span className="nav-rsvp-short" aria-hidden="true">
            RSVP
          </span>
          <ArrowUpRight size={14} />
        </Link>
        <button
          ref={button}
          type="button"
          className="menu-button"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? t.nav.close : t.nav.menu}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={23} /> : <Menu size={23} />}
        </button>
      </div>
      {open && (
        <nav
          id="mobile-navigation"
          className="mobile-nav"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              button.current?.focus();
            }
          }}
          aria-label={
            locale === "en" ? "Mobile navigation" : "Navegación móvil"
          }
        >
          {links.map(([href, label], i) => (
            <Link
              href={href}
              key={href}
              aria-current={pathname === href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              <span className="eyebrow">0{i + 1}</span>
              {label}
              <ArrowUpRight size={20} />
            </Link>
          ))}
          <Link href="/rsvp" onClick={() => setOpen(false)}>
            {t.nav.rsvp}
            <ArrowUpRight size={20} />
          </Link>
        </nav>
      )}
    </header>
  );
}
