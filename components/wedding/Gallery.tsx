"use client";
import Image from "next/image";
import { useRef, useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Photo as PhotoType } from "@/content/wedding";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";
import { Photo } from "./Photo";
export function Gallery({
  photos,
  locale,
  t,
}: {
  photos: PhotoType[];
  locale: Locale;
  t: Dictionary;
}) {
  const realPhotos = photos.filter((p) => p.src);
  const [index, setIndex] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const touchStart = useRef<number | null>(null);
  function close() {
    dialog.current?.close();
    setIndex(null);
  }
  function open(photo: PhotoType) {
    setIndex(realPhotos.findIndex((p) => p.id === photo.id));
    dialog.current?.showModal();
  }
  function move(delta: number) {
    if (index !== null)
      setIndex((index + delta + realPhotos.length) % realPhotos.length);
  }
  useEffect(() => {
    if (index === null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [index]);
  const selected = index === null ? null : realPhotos[index];
  return (
    <>
      <div className="gallery-grid">
        {[0, 1, 2].map((column) => (
          <div className="gallery-column" key={column}>
            {photos
              .filter((_, i) => i % 3 === column)
              .map((p) => (
                <figure className="gallery-cell" key={p.id}>
                  {p.src ? (
                    <button
                      onClick={() => open(p)}
                      aria-label={`${t.common.view}: ${p.alt[locale]}`}
                    >
                      <Photo
                        photo={p}
                        locale={locale}
                        label={t.common.photo}
                        variant={p.orientation}
                        sizes="(max-width: 650px) 50vw, 33vw"
                      />
                    </button>
                  ) : (
                    <Photo
                      photo={p}
                      locale={locale}
                      label={
                        p.orientation === "portrait"
                          ? t.gallery.portrait
                          : t.gallery.landscape
                      }
                      variant={p.orientation}
                    />
                  )}
                  <figcaption>
                    <span>{p.id}</span>
                    {p.caption?.[locale] || (p.src ? "" : t.common.photo)}
                  </figcaption>
                </figure>
              ))}
          </div>
        ))}
      </div>
      {realPhotos.length === 0 && (
        <p className="gallery-note">{t.gallery.pending}</p>
      )}
      <dialog
        ref={dialog}
        className="gallery-dialog"
        aria-label={t.nav.gallery}
        onCancel={close}
        onClose={() => setIndex(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") move(-1);
          if (e.key === "ArrowRight") move(1);
        }}
        onTouchStart={(e) => {
          touchStart.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStart.current !== null) {
            const delta = e.changedTouches[0].clientX - touchStart.current;
            if (Math.abs(delta) > 60) move(delta > 0 ? -1 : 1);
            touchStart.current = null;
          }
        }}
      >
        <button
          onClick={close}
          className="lightbox-close"
          aria-label={t.common.close}
          autoFocus
        >
          <X />
        </button>
        {selected?.src && (
          <>
            <div className="lightbox-image">
              <Image
                src={selected.src}
                alt={selected.alt[locale]}
                fill
                sizes="95vw"
              />
            </div>
            {realPhotos.length > 1 && (
              <>
                <button
                  className="lightbox-control prev"
                  aria-label={t.common.previous}
                  onClick={() => move(-1)}
                >
                  <ChevronLeft />
                </button>
                <button
                  className="lightbox-control next"
                  aria-label={t.common.next}
                  onClick={() => move(1)}
                >
                  <ChevronRight />
                </button>
              </>
            )}
            <p className="lightbox-caption" aria-live="polite">
              {(index ?? 0) + 1} / {realPhotos.length}
              {selected.caption && ` · ${selected.caption[locale]}`}
            </p>
          </>
        )}
      </dialog>
    </>
  );
}
