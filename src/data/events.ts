// =============================================
// Interfaces
// =============================================

export interface UpcomingEvent {
  id: string;
  speaker: string;
  topic: string;
  description: string;
  date: string;
  time: string;
  location: string;
  speakerImage: string;
  backgroundImage: string;
  registrationUrl: string;
}

export interface CompletedEvent {
  title: string;
  description: string;
  date: string;
  attendees: number;
  category: string;
  image: string;
  speaker: string;
  location: string;
  highlights: string[];
  link?: string;
}

// =============================================
// Upcoming Events
// =============================================

export const upcomingEvents: UpcomingEvent[] = [
  {
    id: "evt-2026-1",
    speaker: "DISCOVER DATA WORLD",
    topic: '"Conoce y aprende cómo los datos generan valor"',
    description:
      "Un evento en conjunto con Data Science Research Perú donde exploraremos el mundo del dáta, la ciencia de datos y su impacto en el entorno profesional actual.",
    date: "23 May",
    time: "9:30 AM – 1:00 PM",
    location: "Auditorio FIIS",
    speakerImage: "/mascota/mascota-unicode-fondo-individual.webp",
    backgroundImage: "/convocatoria-bg.webp",
    registrationUrl: "/events",
  },
  {
    id: "evt-2026-2",
    speaker: "SOFTWARE WEEK",
    topic: '"Un espacio entre profesionales tech y estudiantes"',
    description:
      "La segunda edición de la Software Week en la FIIS, un congreso donde conviven profesionales de tecnología y estudiantes. Actividades, charlas, talleres y mucho networking.",
    date: "1 – 5 Set",
    time: "Por definir",
    location: "UNI",
    speakerImage: "/mascota/mascota-unicode-fondo-individual.webp",
    backgroundImage: "/convocatoria-bg.webp",
    registrationUrl: "/events",
  },
];

// =============================================
// Past Events
// =============================================

export const completedEvents: CompletedEvent[] = [
  {
    title: "Tech Day",
    description:
      "Una jornada sobre el impacto práctico de la IA, Data e Infraestructura Cloud con ponentes expertos. Realizado el 18 de abril en el Auditorio CTIC de la UNI.",
    date: "18 Abr 2026",
    attendees: 60,
    category: "Charla",
    image: "/projects/thumbnails/techday-thumbnail.webp",
    speaker: "Arturo Ospina, Jhonatan Morgan, José Guerra",
    location: "Auditorio CTIC – UNI",
    highlights: ["IA", "Data", "Cloud"],
    link: "https://luma.com/mevizytu",
  },
  {
    title: "BEE Geometry",
    description:
      "Concurso de geometría que reunió a estudiantes apasionados por las matemáticas, compitiendo en un entorno de razonamiento espacial y pensamiento analítico.",
    date: "21 Mar 2026",
    attendees: 30,
    category: "Competencia",
    image: "/events/bee-integration.jpg",
    speaker: "Área Académica",
    location: "UNI",
    highlights: ["Geometría", "Competencia"],
    link: "https://www.instagram.com/p/DWSvZzhje0X/?img_index=1",
  },
  {
    title: "Frontiers AI Summit – Applied Intelligence",
    description:
      "Un encuentro enfocado en casos reales de automatización, predicción y transformación digital liderado por expertos de la industria financiera en Perú.",
    date: "18 Dic 2025",
    attendees: 100,
    category: "Summit",
    image: "/events/frontiers-ai-summit.jpg",
    speaker: "Expertos BBVA, BCP, Pacífico",
    location: "Auditorio CTIC - UNI",
    highlights: ["IA", "Transformación Digital"],
    link: "https://www.linkedin.com/feed/update/urn:li:activity:7407272428764155904",
  },
  {
    title: "Software Week 2025",
    description:
      "Primera edición de la Software Week en la FIIS, un evento diseñado para fortalecer la cultura de software y el networking en la comunidad universitaria.",
    date: "Sep 2025",
    attendees: 100,
    category: "Workshop",
    image: "/events/software-week-2025.jpg",
    speaker: "Misael Abanto y otros",
    location: "FIIS - UNI",
    highlights: ["Software", "Networking"],
    link: "https://www.linkedin.com/feed/update/urn:li:activity:7372626080282615808",
  },
  {
    title: "Mi experiencia al lado de Steve Jobs",
    description:
      "Charla magistral compartiendo lecciones sobre innovación y su trabajo con Steve Jobs como uno de los 12 evangelistas tecnológicos originales de Apple.",
    date: "20 Nov 2025",
    attendees: 120,
    category: "Charla",
    image: "/events/steve-jobs-charla.webp",
    speaker: "José Carreón",
    location: "Auditorio FIIS - UNI",
    highlights: ["Innovation", "Apple"],
    link: "https://www.instagram.com/p/DRP7pOgEacL/?img_index=1",
  },
  {
    title: "Integración UNICODE",
    description:
      "Actividad donde los miembros del centro pueden conocerse entre si y pasar un buen rato.",
    date: "21 Feb 2025",
    attendees: 20,
    category: "Integración",
    image: "/events/integracion-unicode.webp",
    speaker: "Directores UNICODE",
    location: "Losas FIIS",
    highlights: ["Social", "Integración"],
    link: "",
  },
  {
    title: "Recepción de Cachimbos",
    description:
      "Actividad en la que todo UNICODE recibe con ansias a los ingresantes del ciclo 2026-1.",
    date: "20 Feb 2026",
    attendees: 30,
    category: "Social",
    image: "/events/recepcion-cachimbos.webp",
    speaker: "Directores UNICODE",
    location: "Puerta 4",
    highlights: ["Social", "Bienvenida"],
    link: "",
  },
  {
    title: "Curso \u201CIntroducción a la programación competitiva\u201d",
    description:
      "5 sesiones guiadas por Rolly Mamani Cutipa (Bronce en IOI 2022), donde se aprendieron algoritmos, pensamiento lógico y disciplina tecnológica. Dirigido a estudiantes que quieran unirse al mundo de la Programación Competitiva.",
    date: "2 Oct 2022",
    attendees: 20,
    category: "Clase",
    image: "/events/prog-competitiva-curso.jpg",
    speaker: "Rolly Mamani Cutipa",
    location: "Salón 999",
    highlights: ["Programación", "Introducción"],
    link: "https://www.facebook.com/share/p/182jckWwRK/",
  },
  {
    title: "BEE INTEGRATION UNI 2025",
    description:
      "Concurso de integrales que reunió a estudiantes de todas las facultades interesados en este tema, mientras participaban por un premio monetario. Más allá del resultado, fue valioso ver el nivel de competitividad sana, constancia y sobre todo disciplina de todos los participantes.",
    date: "05 Dic 2025",
    attendees: 32,
    category: "Competencia",
    image: "/events/bee-integration.jpg",
    speaker: "NS",
    location: "Matadero",
    highlights: ["Integrales", "Premio Monetario"],
    link: "https://www.instagram.com/p/DRx3IQGjZ9G/",
  },
  {
    title: "Taller \u201CIntroducción a las Hackathones\u201d",
    description:
      "3 sesiones dedicadas a sembrar mentalidad innovadora, tecnológica y trabajo colaborativo que permitieron que muchos den su primer paso hacia este mundo. Dirigida a los estudiantes que quieran participar por primera vez en una Hackathon.",
    date: "22 Nov 2025",
    attendees: 30,
    category: "Clase",
    image: "/events/hackathon-taller.jpg",
    speaker: "NS",
    location: "Auditorio FIIS",
    highlights: ["Hackathon", "Introducción"],
    link: "https://www.facebook.com/share/p/1CCUxe5vrE/",
  },
];

// =============================================
// Category to badge styles mapping
// =============================================

export const categoryBadge: Record<string, string> = {
  Hackathon: "bg-purple-900/40 text-purple-200 border-purple-500/50 backdrop-blur-md",
  Workshop: "bg-blue-900/40 text-blue-200 border-blue-500/50 backdrop-blur-md",
  Charla: "bg-green-900/40 text-unicode-light border-unicode/50 backdrop-blur-md",
  Competencia: "bg-amber-900/40 text-amber-200 border-amber-500/50 backdrop-blur-md",
  Panel: "bg-pink-900/40 text-pink-200 border-pink-500/50 backdrop-blur-md",
  Integración: "bg-amber-600/40 text-amber-100 border-amber-400/50 backdrop-blur-md",
  Social: "bg-blue-600/40 text-blue-100 border-blue-400/50 backdrop-blur-md",
  Clase: "bg-green-900/40 text-unicode-light border-unicode/50 backdrop-blur-md",
  Summit: "bg-indigo-900/40 text-indigo-200 border-indigo-500/50 backdrop-blur-md",
};
