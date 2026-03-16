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
    id: "evt-2026-0",
    ponente: "TECH ELEVATE",
    tema: '"Data, IA, Cloud y Liderazgo Tech"',
    descripcion:
      "Una jornada intensiva donde exploraremos las tendencias más disruptivas en Análisis de Datos, Inteligencia Artificial y Cloud Computing, junto con las habilidades de liderazgo necesarias para triunfar en el ecosistema tecnológico actual.",
    fecha: "18 Abr",
    hora: "4:00 PM",
    lugar: "Auditorio FIIS",
    imagenPonente: "/Mascota-Unicode-Fondo-Individual.webp",
    imagenFondo: "/convocatoria_bg.webp",
    inscripcionUrl: "#",
  },
];

// =============================================
// Eventos Realizados
// =============================================

export const eventosRealizados: EventoRealizado[] = [
  {
    titulo: "Frontiers AI Summit – Applied Intelligence",
    descripcion:
      "Un encuentro enfocado en casos reales de automatización, predicción y transformación digital liderado por expertos de la industria financiera en Perú.",
    fecha: "18 Dic 2025",
    asistentes: 100,
    categoria: "Summit",
    imagen:
      "https://media.licdn.com/dms/image/v2/D4E22AQFLGQXizmx7Uw/feedshare-shrink_800/B4EZsvqYQdHcAk-/0/1766031198605?e=2147483647&v=beta&t=HbSaq0SG1a_wk5dgw3t4c-UX6FjLwzGq0y77uJ5VVNo",
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
    imagen:
      "https://media.licdn.com/dms/image/v2/D4E22AQFFJoIgqVtGYw/feedshare-shrink_800/B4EZlDUVsjKoAg-/0/1757771031645?e=2147483647&v=beta&t=3yKzAHlCwDYVcPOieytVMiw2s3kJfD1TTRFZ0XvtCLM",
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
    imagen:
      "https://instagram.flim15-1.fna.fbcdn.net/v/t51.82787-15/584648415_17900945397300535_3251477129900798048_n.webp?_nc_cat=110&ig_cache_key=Mzc2OTQ5MzcyNjI1NjI1ODg2NA%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjE0NDB4MTgwMC5zZHIuQzMifQ%3D%3D&_nc_ohc=A9HuTBobbqkQ7kNvwESiA2x&_nc_oc=AdljtgKGnKLdKFaMsLPKl-6OVxKGX3-jM-PlqQyNiXeuMTXWP9nOFQtwXCrGeJd4koo&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=instagram.flim15-1.fna&_nc_gid=h6y3zlfU8--7fP_pIPGcRw&_nc_ss=8&oh=00_Afw7j239yVassiQUmzfKhubLPEg5unZpjGNf1mxtidD1sQ&oe=69BCC2C0",
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
    imagen: "/Integración_Unicode.webp",
    ponente: "Directores UNICODE",
    lugar: "Losas FIIS",
    highlights: ["Social", "Integración"],
    link: "https://www.linkedin.com/feed/update/urn:li:activity:7372626080282615808",
  },
  {
    titulo: "Recepción de Cachimbos",
    descripcion:
      "Actividad en la que todo UNICODE recibe con ansias a los ingresantes del ciclo 2026-1.",
    fecha: "20 Feb 2026",
    asistentes: 80,
    categoria: "Social",
    imagen: "/Recepción_Cachimbos.webp",
    ponente: "Directores UNICODE",
    lugar: "Puerta 4",
    highlights: ["Social", "Bienvenida"],
    link: "https://www.linkedin.com/feed/update/urn:li:activity:7407272428764155904",
  },
  {
    titulo: "Curso \u201CIntroducción a la programación competitiva\u201D",
    descripcion:
      "5 sesiones guiadas por Rolly Mamani Cutipa (Bronce en IOI 2022), donde se aprendieron algoritmos, pensamiento lógico y disciplina tecnológica. Dirigido a estudiantes que quieran unirse al mundo de la Programación Competitiva.",
    fecha: "2 Oct 2022",
    asistentes: 20,
    categoria: "Clase",
    imagen:
      "https://scontent.flim15-2.fna.fbcdn.net/v/t39.30808-6/556819690_122174640476543134_7928842017477114341_n.webp?stp=dst-jpg_s590x590_tt6&_nc_cat=107&ccb=1-7&_nc_sid=13d280&_nc_ohc=If8Lm5SnbAMQ7kNvwGIrHLQ&_nc_oc=AdkZaN8lvLIFwiddEKkkqFZdDf0C_8n0kinIoukpNqfqGcNyXTnEJawjs0QNtKCRcLc&_nc_zt=23&_nc_ht=scontent.flim15-2.fna&_nc_gid=WDZ3k6PEHp3pB66Awzizrg&_nc_ss=8&oh=00_Afw3wYWkenJ3jxGUdmgfpV5KQdDeUhkdbNOLHumonxlO2g&oe=69BCECE3",
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
    asistentes: 30,
    categoria: "Competencia",
    imagen:
      "https://instagram.flim15-1.fna.fbcdn.net/v/t51.82787-15/649219069_17914732038300535_7955081334375580160_n.webp?stp=dst-jpg_e35_tt6&_nc_cat=105&ig_cache_key=Mzg0OTE5NjAzMDk5OTUxNjU4NA%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjE0NDB4MTgwMC5zZHIuQzMifQ%3D%3D&_nc_ohc=ggcZgHrxqoUQ7kNvwH9ttwv&_nc_oc=AdmSH7AffyWQcvERHl49NXw4r61KvafvRg04NBkiOZDo-L2bQMVDnXadOgv5KJEM8bQ&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=instagram.flim15-1.fna&_nc_gid=n-rUice52qkAed2_e2cUfA&_nc_ss=8&oh=00_AfxVL5iFxO0EpFzm53_Vf-V1cQmJEbGP-EGeyLKSwaiaUA&oe=69BCEE06",
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
    asistentes: 40,
    categoria: "Clase",
    imagen:
      "https://scontent.flim15-2.fna.fbcdn.net/v/t39.30808-6/585333841_122181181952543134_1344603323636497504_n.webp?stp=dst-jpg_p526x296_tt6&_nc_cat=106&ccb=1-7&_nc_sid=13d280&_nc_ohc=KlmW27O-3LYQ7kNvwHlpBs7&_nc_oc=AdlKBZhvMieT0dfXWgmiQLBV9dVHS7SDoB92w3pkwvfbew_FFUEa9csOstDICMDSvts&_nc_zt=23&_nc_ht=scontent.flim15-2.fna&_nc_gid=e2S8oPFDetLstKcMHzOmWg&_nc_ss=8&oh=00_AfyDgERuQ6vcF2A7DRs8WDQgi1nE0VFvIwq-RBOGjyzSAg&oe=69BCC489",
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
