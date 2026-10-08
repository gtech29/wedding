import Link from "next/link";
import { Monogram } from "./Monogram";
import type { Dictionary } from "@/lib/i18n/dictionaries";
export function Footer({ t }: { t: Dictionary }) {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <Link href="/" aria-label="Sarah and Juan">
          <Monogram />
        </Link>
        <p className="serif">{t.common.made}</p>
        <Link href="/rsvp" className="text-link">
          {t.common.rsvp}
          <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <div className="footer-bottom">
        <span>27.08.2027</span>
        <span>SIEMPRE VALLE · BAJA CALIFORNIA</span>
      </div>
    </footer>
  );
}
