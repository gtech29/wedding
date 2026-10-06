import Image from "next/image";
import { Monogram } from "./Monogram";
import type { Photo as PhotoType } from "@/content/wedding";
import type { Locale } from "@/lib/i18n/types";
export function Photo({
  photo,
  locale,
  label,
  className = "",
  variant = "landscape",
  priority = false,
  sizes = "(max-width: 650px) 100vw, 50vw",
}: {
  photo?: PhotoType | null;
  locale: Locale;
  label: string;
  className?: string;
  variant?: "landscape" | "portrait" | "stone";
  priority?: boolean;
  sizes?: string;
}) {
  if (photo?.src)
    return (
      <figure className={`photo-frame ${variant} ${className}`}>
        <Image
          src={photo.src}
          alt={photo.alt[locale]}
          fill
          sizes={sizes}
          preload={priority}
        />
        {photo.caption && (
          <figcaption className="real-caption">
            {photo.caption[locale]}
          </figcaption>
        )}
      </figure>
    );
  return (
    <div
      className={`photo-placeholder ${variant} ${className}`}
      role="img"
      aria-label={label}
    >
      <div className="placeholder-sun" aria-hidden="true" />
      <svg
        className="landscape-lines"
        viewBox="0 0 1440 500"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M-80 330 Q300 40 710 310T1530 190 M-80 390 Q340 140 760 350T1530 260 M-80 450 Q360 260 830 420T1530 320" />
        <path d="M700 310 160 560 M750 320 360 560 M800 330 560 560 M850 340 760 560 M900 347 960 560 M950 352 1160 560 M1000 357 1360 560" />
      </svg>
      <div className="placeholder-center">
        <Monogram />
        <span>{label}</span>
      </div>
      <span className="placeholder-number" aria-hidden="true">
        S&amp;J — 2027
      </span>
    </div>
  );
}
