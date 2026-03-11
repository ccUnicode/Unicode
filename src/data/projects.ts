export interface TeamMember {
  name: string;
  linkedin: string;
  image: string;
}

export interface Project {
  id: number;
  title: string;
  description: string;
  longDescription: string;
  status: "Activo" | "Culminado";
  faculty: string;
  category?: string;
  image: string;
  screenshots: string[];
  team: TeamMember[];
  link: string;
  area: string;
}

const teamMock: TeamMember[] = Array(6).fill({
  name: "Renato Gutierrez",
  linkedin: "renato-gutierrez",
  image: "/home-img1.png",
});

export const projects: Project[] = [
  {
    id: 1,
    title: "SGA Unicode",
    description:
      "Sistema de Gestión Académica para la automatización de procesos internos.",
    longDescription:
      "SGA Unicode es una plataforma interactiva que contiene material de evaluaciones de ciclos pasados y secciones donde podrás conocer a todos los profesores. Tendrás acceso a todas las planchas de los cursos de ciencias básicas y los cursos de carrera más populares y difíciles, y todo este material lo podrás aprovechar para practicar y mejorar tus habilidades",
    status: "Activo",
    faculty: "DCC",
    category: "Destacado",
    image: "/bienvenida_cachimbos.png",
    screenshots: ["/bienvenida_cachimbos.png", "/home-img2.png"],
    team: teamMock,
    link: "https://unicode.vercel.app",
    area: "desarrollo",
  },
  {
    id: 2,
    title: "Unicode Web",
    description:
      "Portal oficial de la comunidad UNICODE construido con Astro y Tailwind CSS.",
    longDescription:
      "La plataforma principal que representa a toda la comunidad UNICODE, alojando proyectos, eventos, noticias y mucho más.",
    status: "Activo",
    faculty: "DCC",
    category: "Destacado",
    image: "/bienvenida_cachimbos.png",
    screenshots: ["/home-img1.png", "/convocatoria_bg.png"],
    team: teamMock,
    link: "https://unicode.vercel.app",
    area: "desarrollo",
  },
  {
    id: 3,
    title: "App Matrícula",
    description:
      "Aplicación móvil para facilitar el proceso de matrícula de los estudiantes.",
    longDescription:
      "Aplicación diseñada exclusivamente para mejorar el flujo de matrícula universitaria. Permite a los estudiantes armar sus horarios con simuladores, verificar cupos en tiempo real e inscribirse con tan solo un clic. Integra validación de requisitos y envío de comprobantes de manera totalmente automatizada para todas las facultades.",
    status: "Activo",
    faculty: "DCC",
    category: "Destacado",
    image: "/bienvenida_cachimbos.png",
    screenshots: ["/bienvenida_cachimbos.png", "/home-img2.png"],
    team: teamMock,
    link: "https://unicode.vercel.app",
    area: "diseño",
  },
  {
    id: 4,
    title: "Blockchain Voting",
    description:
      "Sistema de votación transparente utilizando tecnología blockchain.",
    longDescription:
      "Plataforma de votación estudiantil construida bajo tecnología descentralizada para garantizar transparencia, anonimato y seguridad absoluta. Los votos son inmutables y pueden ser verificados públicamente por toda la facultad, eliminando por completo cualquier posibilidad de fraude o alteración electoral.",
    status: "Culminado",
    faculty: "DCC",
    category: "Destacado",
    image: "/bienvenida_cachimbos.png",
    screenshots: ["/convocatoria_bg.png", "/home-img1.png"],
    team: teamMock,
    link: "https://unicode.vercel.app",
    area: "ciberseguridad",
  },
  {
    id: 5,
    title: "AI Tutor",
    description:
      "Asistente virtual de aprendizaje basado en inteligencia artificial.",
    longDescription:
      "Un tutor virtual inteligente entrenado con el sílabo y material de los cursos más exigentes de la facultad. Los alumnos pueden realizar consultas en tiempo real las 24 horas del día. Además, la inteligencia artificial evalúa el progreso continuo del estudiante para generar cuestionarios dinámicos hiper-personalizados.",
    status: "Culminado",
    faculty: "DCC",
    category: "Destacado",
    image: "/bienvenida_cachimbos.png",
    screenshots: ["/home-img2.png", "/bienvenida_cachimbos.png"],
    team: teamMock,
    link: "https://unicode.vercel.app",
    area: "data",
  },
  {
    id: 6,
    title: "IoT Smart Lab",
    description:
      "Monitoreo y control de laboratorios mediante dispositivos IoT.",
    longDescription:
      "Sistema integral de hardware y software que automatiza la iluminación, el control de temperatura y el control de acceso a los laboratorios de cómputo. Permite la reserva inteligente de máquinas y el monitoreo en vivo del consumo energético e inventario del centro de datos.",
    status: "Activo",
    faculty: "DCC",
    image: "/convocatoria_bg.png",
    screenshots: ["/home-img1.png", "/home-img2.png"],
    team: teamMock,
    link: "https://unicode.vercel.app",
    area: "desarrollo",
  },
  {
    id: 7,
    title: "DataViz Dashboard",
    description:
      "Visualización de datos académicos para la toma de decisiones.",
    longDescription:
      "Herramienta avanzada de Business Intelligence orientada al perfilamiento académico. Analiza información masiva proveniente de calificaciones e historiales para generar paneles interactivos orientados a la rápida toma de decisiones administrativas en favor del alumnado.",
    status: "Culminado",
    faculty: "DCC",
    image: "/convocatoria_bg.png",
    screenshots: ["/convocatoria_bg.png", "/bienvenida_cachimbos.png"],
    team: teamMock,
    link: "https://unicode.vercel.app",
    area: "data",
  },
];

export const featuredProjects = projects.filter((p) => p.category === "Destacado");
