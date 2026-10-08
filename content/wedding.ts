import type { Localized } from "@/lib/i18n/types";
export type Photo = {
  id: string;
  src: string | null;
  orientation: "portrait" | "landscape";
  alt: Localized;
  caption?: Localized;
};
export type Recommendation = {
  id: string;
  name: string;
  category:
    | "wineries"
    | "restaurants"
    | "food"
    | "experiences"
    | "sightseeing"
    | "relaxation"
    | "nearby";
  description: Localized;
  photo?: Photo;
  websiteUrl?: string;
  mapUrl?: string;
  address?: string;
  note?: Localized;
};
export type TravelSection = {
  id: string;
  enabled: boolean;
  title: Localized;
  body: Localized | null;
  url?: string;
  linkLabel?: Localized;
};
export const wedding = {
  names: "Sarah and Juan",
  date: "2027-08-27",
  domain: "https://sarahandjuan.com",
  venue: "Siempre Valle",
  // Confirm the ceremony time before entering a localized display value here.
  ceremonyTime: null as Localized | null,
  heroPhoto: {
    id: "hero",
    src: "/images/hero.jpg",
    orientation: "landscape",
    alt: {
      en: "Sarah and Juan together",
      "es-MX": "Sarah y Juan juntos",
    },
  } as Photo,
  venuePhoto: {
    id: "venue",
    src: "/images/venue1.png",
    orientation: "portrait",
    alt: {
      en: "Siempre Valle in Valle de Guadalupe",
      "es-MX": "Siempre Valle en Valle de Guadalupe",
    },
  } as Photo,
  story: {
    body: null as Localized | null,
    milestones: [] as { date: string; title: Localized; body: Localized }[],
  },
  honeymoon: { url: null as string | null, message: null as Localized | null },
};
export const recommendations: Recommendation[] = [];
export const travelSections: TravelSection[] = [
  {
    id: "getting-there",
    enabled: true,
    title: { en: "Getting there", "es-MX": "Cómo llegar" },
    body: null,
  },
  {
    id: "where-to-stay",
    enabled: true,
    title: { en: "Where to stay", "es-MX": "Dónde hospedarte" },
    body: null,
  },
  {
    id: "transportation",
    enabled: true,
    title: { en: "Transportation", "es-MX": "Transporte" },
    body: null,
  },
  {
    id: "parking",
    enabled: true,
    title: { en: "Parking", "es-MX": "Estacionamiento" },
    body: null,
  },
  {
    id: "international",
    enabled: true,
    title: {
      en: "Border & international travel",
      "es-MX": "Cruce fronterizo y viajes internacionales",
    },
    body: null,
  },
];
export const faqs: { id: string; question: Localized; answer: Localized }[] = [
  {
    id: "children",
    question: {
      en: "Are children invited?",
      "es-MX": "¿Pueden asistir niños?",
    },
    answer: {
      en: "Our wedding will be an adults-only celebration. Thank you for understanding and for making arrangements so you can enjoy this day with us.",
      "es-MX":
        "Nuestra boda será una celebración solo para adultos. Gracias por comprender y por organizarte para disfrutar este día con nosotros.",
    },
  },
];
export const galleryPhotos: Photo[] = [
  {
    id: "01",
    src: null,
    orientation: "portrait",
    alt: {
      en: "Engagement portrait placeholder",
      "es-MX": "Espacio para retrato de compromiso",
    },
  },
  {
    id: "02",
    src: null,
    orientation: "landscape",
    alt: {
      en: "Engagement landscape placeholder",
      "es-MX": "Espacio para fotografía horizontal de compromiso",
    },
  },
  {
    id: "03",
    src: null,
    orientation: "portrait",
    alt: {
      en: "Engagement portrait placeholder",
      "es-MX": "Espacio para retrato de compromiso",
    },
  },
  {
    id: "04",
    src: null,
    orientation: "landscape",
    alt: {
      en: "Engagement landscape placeholder",
      "es-MX": "Espacio para fotografía horizontal de compromiso",
    },
  },
  {
    id: "05",
    src: null,
    orientation: "portrait",
    alt: {
      en: "Engagement portrait placeholder",
      "es-MX": "Espacio para retrato de compromiso",
    },
  },
  {
    id: "06",
    src: null,
    orientation: "landscape",
    alt: {
      en: "Engagement landscape placeholder",
      "es-MX": "Espacio para fotografía horizontal de compromiso",
    },
  },
];
