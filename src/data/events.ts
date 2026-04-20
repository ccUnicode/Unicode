// =============================================
// Interfaces
// =============================================

export interface Evento {
  id: string;
  ponente: string;
  tema: string;
  descripcion: string;
  fecha: string;
  hora: string;
  lugar: string;
  imagenPonente: string;
  imagenFondo: string;
  inscripcionUrl: string;
}

export interface EventoRealizado {
  titulo: string;
  descripcion: string;
  fecha: string;
  asistentes: number;
  categoria: string;
  imagen: string;
  ponente: string;
  lugar: string;
  highlights: string[];
  link?: string;
}

// =============================================
// Próximos Eventos
// =============================================

export const proximosEventos: Evento[] = [
  {
    id: "evt-2026-1",
    ponente: "DISCOVER DATA WORLD",
    tema: '"Conectando propósitos, creando oportunidades"',
    descripcion:
      "Un evento en conjunto con Data Science Research Perú donde exploraremos el mundo del dáta, la ciencia de datos y su impacto en el entorno profesional actual.",
    fecha: "23 May",
    hora: "9:30 AM – 1:00 PM",
    lugar: "Por confirmar",
    imagenPonente: "/mascota/Mascota-Unicode-Fondo-Individual.webp",
    imagenFondo: "/convocatoria_bg.webp",
    inscripcionUrl: "/eventos",
  },
  {
    id: "evt-2026-2",
    ponente: "SOFTWARE WEEK",
    tema: '"Un espacio entre profesionales tech y estudiantes"',
    descripcion:
      "La segunda edición de la Software Week en la FIIS, un congreso donde conviven profesionales de tecnología y estudiantes. Actividades, charlas, talleres y mucho networking.",
    fecha: "1 – 5 Set",
    hora: "Por definir",
    lugar: "FIIS – UNI",
    imagenPonente: "/mascota/Mascota-Unicode-Fondo-Individual.webp",
    imagenFondo: "/convocatoria_bg.webp",
    inscripcionUrl: "/eventos",
  },
];

// =============================================
// Eventos Realizados
// =============================================

export const eventosRealizados: EventoRealizado[] = [
  {
    titulo: "Tech Day",
    descripcion:
      "Una jornada sobre el impacto práctico de la IA, Data e Infraestructura Cloud con ponentes expertos. Realizado el 18 de abril en el Auditorio CTIC de la UNI.",
    fecha: "18 Abr 2026",
    asistentes: 60,
    categoria: "Charla",
    imagen: "/projects/thumbnails/techday_thumbnail.webp",
    ponente: "Arturo Ospina, Jhonatan Morgan, José Guerra",
    lugar: "Auditorio CTIC – UNI",
    highlights: ["IA", "Data", "Cloud"],
    link: "https://luma.com/mevizytu",
  },
  {
    titulo: "BEE Geometry",
    descripcion:
      "Concurso de geometría que reunió a estudiantes apasionados por las matemáticas, compitiendo en un entorno de razonamiento espacial y pensamiento analítico.",
    fecha: "21 Mar 2026",
    asistentes: 30,
    categoria: "Competencia",
    imagen: "/eventos/bee-integration.jpg",
    ponente: "NS",
    lugar: "UNI",
    highlights: ["Geometría", "Competencia"],
    link: "https://www.instagram.com/p/DWSvZzhje0X/?img_index=1",
  },
  {
    titulo: "Frontiers AI Summit – Applied Intelligence",
    descripcion:
      "Un encuentro enfocado en casos reales de automatización, predicción y transformación digital liderado por expertos de la industria financiera en Perú.",
    fecha: "18 Dic 2025",
    asistentes: 100,
    categoria: "Summit",
    imagen: "/eventos/frontiers-ai-summit.jpg",
    ponente: "Expertos BBVA, BCP, Pacífico",
    lugar: "Auditorio CTIC - UNI",
    highlights: ["IA", "Transformación Digital"],
    link: "https://www.linkedin.com/feed/update/urn:li:activity:7407272428764155904",
  },
  {
    titulo: "Software Week 2025",
    descripcion:
      "Primera edición de la Software Week en la FIIS, un evento diseñado para fortalecer la cultura de software y el networking en la comunidad universitaria.",
    fecha: "Sep 2025",
    asistentes: 100,
    categoria: "Workshop",
    imagen: "/eventos/software-week-2025.jpg",
    ponente: "Misael Abanto y otros",
    lugar: "FIIS - UNI",
    highlights: ["Software", "Networking"],
    link: "https://www.linkedin.com/feed/update/urn:li:activity:7372626080282615808",
  },
  {
    titulo: "Mi experiencia al lado de Steve Jobs",
    descripcion:
      "Charla magistral compartiendo lecciones sobre innovación y su trabajo con Steve Jobs como uno de los 12 evangelistas tecnológicos originales de Apple.",
    fecha: "20 Nov 2025",
    asistentes: 120,
    categoria: "Charla",
    imagen: "/eventos/steve-jobs-charla.webp",
    ponente: "José Carreón",
    lugar: "Auditorio FIIS - UNI",
    highlights: ["Innovation", "Apple"],
    link: "https://www.instagram.com/p/DRP7pOgEacL/?img_index=1",
  },
  {
    titulo: "Integración UNICODE",
    descripcion:
      "Actividad donde los miembros del centro pueden conocerse entre si y pasar un buen rato.",
    fecha: "21 Feb 2025",
    asistentes: 20,
    categoria: "Integración",
    imagen: "/eventos/integracion-unicode.webp",
    ponente: "Directores UNICODE",
    lugar: "Losas FIIS",
    highlights: ["Social", "Integración"],
    link: "",
  },
  {
    titulo: "Recepción de Cachimbos",
    descripcion:
      "Actividad en la que todo UNICODE recibe con ansias a los ingresantes del ciclo 2026-1.",
    fecha: "20 Feb 2026",
    asistentes: 30,
    categoria: "Social",
    imagen: "/eventos/recepcion-cachimbos.webp",
    ponente: "Directores UNICODE",
    lugar: "Puerta 4",
    highlights: ["Social", "Bienvenida"],
    link: "",
  },
  {
    titulo: "Curso \u201CIntroducción a la programación competitiva\u201D",
    descripcion:
      "5 sesiones guiadas por Rolly Mamani Cutipa (Bronce en IOI 2022), donde se aprendieron algoritmos, pensamiento lógico y disciplina tecnológica. Dirigido a estudiantes que quieran unirse al mundo de la Programación Competitiva.",
    fecha: "2 Oct 2022",
    asistentes: 20,
    categoria: "Clase",
    imagen: "/eventos/prog-competitiva-curso.jpg",
    ponente: "Rolly Mamani Cutipa",
    lugar: "Salón 999",
    highlights: ["Programación", "Introducción"],
    link: "https://www.facebook.com/share/p/182jckWwRK/",
  },
  {
    titulo: "BEE INTEGRATION UNI 2025",
    descripcion:
      "Concurso de integrales que reunió a estudiantes de todas las facultades interesados en este tema, mientras participaban por un premio monetario. Más allá del resultado, fue valioso ver el nivel de competitividad sana, constancia y sobre todo disciplina de todos los participantes.",
    fecha: "05 Dic 2025",
    asistentes: 32,
    categoria: "Competencia",
    imagen: "/eventos/bee-integration.jpg",
    ponente: "NS",
    lugar: "Matadero",
    highlights: ["Integrales", "Premio Monetario"],
    link: "https://www.instagram.com/p/DRx3IQGjZ9G/",
  },
  {
    titulo: "Taller \u201CIntroducción a las Hackathones\u201D",
    descripcion:
      "3 sesiones dedicadas a sembrar mentalidad innovadora, tecnológica y trabajo colaborativo que permitieron que muchos den su primer paso hacia este mundo. Dirigida a los estudiantes que quieran participar por primera vez en una Hackathon.",
    fecha: "22 Nov 2025",
    asistentes: 30,
    categoria: "Clase",
    imagen: "/eventos/hackathon-taller.jpg",
    ponente: "NS",
    lugar: "Auditorio FIIS",
    highlights: ["Hackathon", "Introducción"],
    link: "https://www.facebook.com/share/p/1CCUxe5vrE/",
  },
];

// =============================================
// Mapeo de categorías a estilos de badges
// =============================================

export const categoriaBadge: Record<string, string> = {
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
