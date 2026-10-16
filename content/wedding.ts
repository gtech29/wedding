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
  pending?: Localized;
  links?: { url: string; label: Localized }[];
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
    id: "arrival",
    enabled: true,
    title: { en: "Arrival planning", "es-MX": "Planea tu llegada" },
    body: {
      en: "We’ll be hosting a welcome celebration on August 26, 2027. We’d love for you to join us if your travel plans allow. Please allow enough time to arrive and check in beforehand.",
      "es-MX":
        "Tendremos una celebración de bienvenida el 26 de agosto de 2027. Nos encantaría que nos acompañaras si tus planes de viaje lo permiten. Procura llegar con tiempo para registrarte en tu hospedaje antes de la celebración.",
    },
    pending: {
      en: "The welcome celebration’s time and location will be shared once confirmed.",
      "es-MX":
        "Compartiremos el horario y el lugar de la bienvenida en cuanto estén confirmados.",
    },
  },
  {
    id: "getting-there",
    enabled: true,
    title: { en: "Getting there", "es-MX": "Cómo llegar" },
    body: {
      en: "Most guests will drive from Southern California, crossing into Baja California and continuing to Valle de Guadalupe. Allow flexibility for the border crossing and your journey.",
      "es-MX":
        "La mayoría de los invitados viajará en auto desde el sur de California, cruzando a Baja California y siguiendo hacia el Valle de Guadalupe. Considera tiempo adicional para el cruce fronterizo y el recorrido.",
    },
    pending: {
      en: "We’re confirming the venue’s entrance pin and final approach instructions. Once confirmed, we’ll share a Get directions button, the address, and short entrance instructions, with a photo or landmark if available.",
      "es-MX":
        "Estamos confirmando la ubicación exacta de la entrada y las indicaciones para el último tramo. Cuando estén listas, agregaremos un botón de Cómo llegar, la dirección y las instrucciones de acceso, con una foto o un punto de referencia si lo tenemos.",
    },
  },
  {
    id: "flying",
    enabled: true,
    title: { en: "Flying", "es-MX": "Si viajas en avión" },
    body: {
      en: "If you’re traveling from El Paso or Ciudad Juárez, flights from Ciudad Juárez to Tijuana are an option to compare. Check routes and availability for your dates, and arrange ground transportation to Valle de Guadalupe separately.\n\nSan Diego Airport is another option, with onward ground transportation across the border into Mexico.\n\nCBX is a pedestrian bridge for eligible Tijuana Airport passengers. It is not a separate airport or a general border crossing for passengers flying into San Diego Airport. Review CBX eligibility before making plans.",
      "es-MX":
        "Si viajas desde El Paso o Ciudad Juárez, puedes comparar vuelos de Ciudad Juárez a Tijuana. Revisa las rutas y la disponibilidad para tus fechas y organiza por separado el transporte terrestre al Valle de Guadalupe.\n\nOtra opción es el aeropuerto de San Diego; desde ahí tendrás que organizar transporte terrestre y cruzar la frontera hacia México.\n\nCBX es un puente peatonal para pasajeros del aeropuerto de Tijuana que cumplen con sus requisitos. No es otro aeropuerto ni un cruce fronterizo de uso general para quienes llegan al aeropuerto de San Diego. Revisa los requisitos de CBX antes de hacer planes.",
    },
    links: [
      {
        url: "https://www.crossborderxpress.com/en/requirements",
        label: {
          en: "Official CBX requirements",
          "es-MX": "Requisitos oficiales de CBX",
        },
      },
    ],
  },
  {
    id: "where-to-stay",
    enabled: true,
    title: { en: "Where to stay", "es-MX": "Dónde hospedarte" },
    body: null,
    pending: {
      en: "We’re putting together nearby lodging options and will share recommendations and booking details here.",
      "es-MX":
        "Estamos reuniendo opciones de hospedaje cercanas. Aquí compartiremos las recomendaciones y los detalles para reservar.",
    },
  },
  {
    id: "transportation",
    enabled: true,
    title: { en: "Transportation", "es-MX": "Transporte" },
    body: null,
    pending: {
      en: "We’re exploring transportation between selected hotels and the venue. Pickup locations, schedules, and reservation details will be posted once confirmed.",
      "es-MX":
        "Estamos explorando opciones de transporte entre algunos hoteles y el lugar de la boda. Publicaremos los puntos de salida, horarios y detalles para reservar en cuanto estén confirmados.",
    },
  },
  {
    id: "parking",
    enabled: true,
    title: { en: "Parking", "es-MX": "Estacionamiento" },
    body: {
      en: "Parking will be available at the venue. Please confirm parking arrangements directly with your lodging.",
      "es-MX":
        "Habrá estacionamiento en el lugar de la boda. Confirma directamente con tu hospedaje las opciones de estacionamiento que ofrece.",
    },
    pending: {
      en: "Venue parking details will follow.",
      "es-MX":
        "Más adelante compartiremos los detalles del estacionamiento del lugar.",
    },
  },
  {
    id: "international",
    enabled: true,
    title: {
      en: "Border & international travel",
      "es-MX": "Cruce fronterizo y viajes internacionales",
    },
    body: {
      en: "Check entry and return requirements for your citizenship, residency status, and travel route using official guidance. Check them again before you travel.\n\nIf you’re driving, arrange appropriate Mexican auto insurance. If you’re renting a car, confirm that the rental company permits cross-border travel.",
      "es-MX":
        "Consulta en fuentes oficiales los requisitos de entrada y regreso según tu nacionalidad, situación migratoria y ruta de viaje. Revísalos de nuevo antes de viajar.\n\nSi vas a manejar, contrata un seguro de auto con cobertura adecuada en México. Si rentas un auto, confirma que la arrendadora permita cruzar la frontera.",
    },
    links: [
      {
        url: "https://www.gob.mx/inm",
        label: {
          en: "Mexico entry guidance · INM",
          "es-MX": "Información de entrada a México · INM",
        },
      },
      {
        url: "https://www.cbp.gov/travel",
        label: {
          en: "U.S. entry and return guidance · CBP",
          "es-MX": "Entrada y regreso a Estados Unidos · CBP",
        },
      },
      {
        url: "https://travel.state.gov/content/travel/en/international-travel/before-you-go/driving-and-road-safety.html",
        label: {
          en: "Driving abroad · U.S. Department of State",
          "es-MX":
            "Conducir en el extranjero · Departamento de Estado de EE. UU.",
        },
      },
    ],
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
