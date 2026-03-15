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
    title: "INTRODUCCIÓN A LA PROGRAMACIÓN COMPETITIVA",
    description:
      "Aprende a resolver problemas complejos, optimizar código y dar tus primeros pasos en el mundo del ICPC.",
    longDescription:
      "¿Te gustaría aprender a resolver problemas como en Codeforces y dar tus primeros pasos rumbo al ICPC? En este curso práctico dictado por Rolly Mamani (Bronce IOI 2022), descubrirás las técnicas de los competidores de alto nivel: desde pensar bajo presión hasta escribir código sólido y optimizado. Un taller diseñado para estudiantes que buscan dominar las buenas prácticas de programación competitiva.",
    status: "Culminado",
    faculty: "Académica",
    category: "Destacado",
    image: "/projects/thumbnails/intro_programacion_competitiva-thumbnail.jpg",
    screenshots: ["/bienvenida_cachimbos.png", "/home-img2.png"],
    team: teamMock,
    link: "https://intro-programacion-competitiva.web.app/",
    area: "académica",
  },
  {
    id: 2,
    title: "INTRODUCCIÓN A HACKATONES",
    description:
      "Aprende a armar equipos, plantear soluciones rápidas y presentar proyectos ganadores en hackatones.",
    longDescription:
      "¿Te gustaría participar en hackatones pero no sabes por dónde empezar? En este taller junto a UNICODE aprenderás desde cero qué es un hackatón, cómo formar un equipo estratégico, metodologías para plantear soluciones bajo presión y técnicas de pitching para presentar tu proyecto como un profesional. ¡Ideal para iniciar tu camino en la innovación competitiva!",
    status: "Culminado",
    faculty: "Académica",
    category: "Destacado",
    image: "/projects/thumbnails/intro_hackatones-thumbnail.jpg",
    screenshots: ["/home-img1.png", "/convocatoria_bg.png"],
    team: teamMock,
    link: "https://hackaton-taller.web.app/",
    area: "académica",
  },
  {
    id: 3,
    title: "BEE INTEGRATION UNI 2025",
    description:
      "Concurso de integrales que reunió a estudiantes de todas las facultades interesados en este tema.",
    longDescription:
      "Concurso de integrales que reunió a estudiantes de todas las facultades interesados en este tema, mientras participaban por un premio monetario. Más allá del resultado, fue valioso ver el nivel de competitividad sana, constancia y sobre todo disciplina de todos los participantes.",
    status: "Culminado",
    faculty: "Académica",
    category: "Destacado",
    image: "/bienvenida_cachimbos.png",
    screenshots: ["/bienvenida_cachimbos.png"],
    team: teamMock,
    link: "https://www.youtube.com/watch?v=vP-7lS4rO9s&t=1808s",
    area: "académica",
  },
  {
    id: 4,
    title: "UNIOpenCourse 25-2",
    description: "Grabación de las clases dictadas presencialmente en la FIIS para ponerlas a disposición de la comunidad universitaria.",
    longDescription: "UNIOpenCourse 25-2 es una iniciativa de UNICODE inspirada en el modelo del MIT para democratizar el acceso al conocimiento. El proyecto consiste en la grabación sistemática de clases presenciales en la FIIS, publicándolas de forma abierta para que estudiantes de toda la comunidad puedan consultar temas clave como Cálculo, Álgebra y Sistemas Operativos de manera gratuita y accesible.",
    status: "Culminado",
    faculty: "Académica",
    image: "/bienvenida_cachimbos.png",
    screenshots: [
      "/projects/screenshots/uniopencourse-screenshoot1.jpg",
      "/projects/screenshots/uniopencourse-screenshoot2.jpg"
    ],
    team: [
      { name: "Alexis Garay", linkedin: "alexis-garay", image: "/projects/team/Alexis_Garay.jpg" },
      { name: "Jean Paul Beltran", linkedin: "jean-paul-beltran", image: "/projects/team/Jean_Paul_Beltran.jpg" },
      { name: "Jeanpier Robles", linkedin: "jeanpier-robles", image: "/AreasImages/Jeanpier_Robles.png" },
      { name: "Renato Gutierrez", linkedin: "renato-gutierrez", image: "/AreasImages/Renato_Gutierrez.png" },
      { name: "Gino Romero", linkedin: "gino-romero", image: "/AreasImages/Gino_Romero.png" },
      { name: "Franz Nuñez", linkedin: "franz-nunez", image: "/AreasImages/Franz_Nuñez.png" },
    ],
    link: "https://unicode.vercel.app",
    area: "académica",
  },
  {
    id: 5,
    title: "EducaTech",
    description: "Ejecución de una estrategia de contenidos 'Edu-Tech' en redes sociales.",
    longDescription: "EducaTech es una iniciativa enfocada en la creación y difusión de contenido educativo tecnológico a través de redes sociales, buscando acercar la tecnología a toda la comunidad estudiantil de forma dinámica.",
    status: "Activo",
    faculty: "DCC",
    image: "/areasmoment.png",
    screenshots: ["/areasmoment.png"],
    team: teamMock,
    link: "https://unicode.vercel.app",
    area: "dcc",
  },
  {
    id: 6,
    title: "Unicode on Air",
    description: "Producción de contenido audiovisual basado en la interacción presencial en el campus.",
    longDescription: "Proyecto dedicado a capturar la esencia de la vida universitaria y la tecnología mediante entrevistas e interacciones en vivo con los estudiantes dentro del campus de la UNI.",
    status: "Activo",
    faculty: "DCC",
    image: "/areasmoment.png",
    screenshots: ["/areasmoment.png"],
    team: teamMock,
    link: "https://unicode.vercel.app",
    area: "dcc",
  },
  {
    id: 7,
    title: "Backstage FIIS",
    description: "Serie de vlogs documentales que narran la 'experiencia del estudiante' en la facultad.",
    longDescription: "Una mirada íntima a lo que sucede detrás de cámaras en la FIIS, mostrando el día a día, los retos académicos y la cultura estudiantil a través de vlogs documentales.",
    status: "Activo",
    faculty: "DCC",
    image: "/areasmoment.png",
    screenshots: ["/areasmoment.png"],
    team: teamMock,
    link: "https://unicode.vercel.app",
    area: "dcc",
  },
  {
    id: 8,
    title: "Unicode Quizzes",
    description: "Estrategia de gamificación digital utilizando principalmente redes sociales.",
    longDescription: "Fomentamos el aprendizaje y la interacción mediante trivias y retos tecnológicos gamificados, aprovechando las plataformas digitales para crear una comunidad más participativa.",
    status: "Activo",
    faculty: "DCC",
    image: "/areasmoment.png",
    screenshots: ["/areasmoment.png"],
    team: teamMock,
    link: "https://unicode.vercel.app",
    area: "dcc",
  },
  {
    id: 9,
    title: "Unicode Podcast",
    description: "Producción de contenido long-form para YouTube con clips para redes sociales.",
    longDescription: "Espacio de conversación profunda sobre tecnología, carrera profesional y vida universitaria, distribuido en episodios completos en YouTube y condensado en clips de alto impacto.",
    status: "Activo",
    faculty: "DCC",
    image: "/areasmoment.png",
    screenshots: ["/areasmoment.png"],
    team: teamMock,
    link: "https://unicode.vercel.app",
    area: "dcc",
  },
  {
    id: 10,
    title: "Editorial Unicode",
    description: "Producción enfocada en la transcripción y formateo de material académico a LaTeX.",
    longDescription: "Digitalización y estandarización de material de estudio, solucionarios y guías académicas utilizando LaTeX para garantizar la máxima calidad editorial para los estudiantes.",
    status: "Activo",
    faculty: "DCC",
    image: "/areasmoment.png",
    screenshots: ["/areasmoment.png"],
    team: teamMock,
    link: "https://unicode.vercel.app",
    area: "dcc",
  },
  {
    id: 11,
    title: "Revista Unicode",
    description: "Difusión de noticias tecnológicas y actualizaciones de la comunidad.",
    longDescription: "Publicación periódica que recopila lo último en innovación, eventos de la comunidad y artículos técnicos de interés para el ecosistema tecnológico de la facultad.",
    status: "Activo",
    faculty: "DCC",
    image: "/areasmoment.png",
    screenshots: ["/areasmoment.png"],
    team: teamMock,
    link: "https://unicode.vercel.app",
    area: "dcc",
  },
  {
    id: 12,
    title: "Taller de LaTex",
    description: "Programa de formación para estandarizar el nivel de edición de documentos.",
    longDescription: "Capacitaciones prácticas dirigidas a estudiantes para el dominio de LaTeX, permitiéndoles crear documentos académicos y técnicos con acabado profesional.",
    status: "Activo",
    faculty: "DCC",
    image: "/areasmoment.png",
    screenshots: ["/areasmoment.png"],
    team: teamMock,
    link: "https://unicode.vercel.app",
    area: "dcc",
  },
  {
    id: 13,
    title: "Taller de EC y EA",
    description: "Taller estratégico enfocado en potenciar la marca personal de los miembros.",
    longDescription: "Estrategias de Entrenamiento en Comunicación y Entrenamiento en Audiovisuales diseñadas para fortalecer la presencia digital y marca personal de los integrantes de la comunidad.",
    status: "Activo",
    faculty: "DCC",
    image: "/areasmoment.png",
    screenshots: ["/areasmoment.png"],
    team: teamMock,
    link: "https://unicode.vercel.app",
    area: "dcc",
  },
  {
    id: 14,
    title: "Recepción de Cachimbos",
    description: "Evento de bienvenida diseñado para orientar e integrar a los nuevos estudiantes ingresantes a la UNI.",
    longDescription: "La Recepción de Cachimbos es una jornada especial organizada para recibir a los nuevos talentos de la universidad. A través de charlas informativas, recorridos y dinámicas grupales, buscamos que los recién ingresantes se sientan parte de la comunidad desde el primer día, brindándoles las herramientas necesarias para iniciar su etapa universitaria con éxito.",
    status: "Activo",
    faculty: "GTH",
    image: "/bienvenida_cachimbos.png",
    screenshots: ["/bienvenida_cachimbos.png"],
    team: teamMock,
    link: "https://unicode.vercel.app",
    area: "gth",
  },
  {
    id: 15,
    title: "Integración UNICODE",
    description: "Encuentro dinámico para fortalecer los lazos entre los miembros y fomentar la familia UNICODE.",
    longDescription: "Este proyecto se centra en el activo más valioso de nuestra organización: las personas. Las reuniones de integración son espacios diseñados para que los miembros de todas las áreas se conozcan mejor, compartan experiencias y fortalezcan el trabajo en equipo mediante actividades recreativas y dinámicas de grupo, cultivando una cultura organizacional sólida y unida.",
    status: "Activo",
    faculty: "GTH",
    image: "/home-img1.png",
    screenshots: ["/home-img1.png"],
    team: teamMock,
    link: "https://unicode.vercel.app",
    area: "gth",
  },
  {
    id: 16,
    title: "TrikaWeb",
    description: "Plataforma web oficial de UNICODE, centralizando información, eventos y proyectos.",
    longDescription: "TrikaWeb es el núcleo de desarrollo digital de UNICODE, enfocado en diseñar, desarrollar y mantener la plataforma web de la organización. Utiliza tecnologías modernas para brindar una experiencia de usuario fluida y estética, representando la identidad de UNICODE en el entorno digital.",
    status: "Activo",
    faculty: "I+D",
    image: "/home-img2.png",
    screenshots: ["/home-img2.png"],
    team: teamMock,
    link: "https://unicode.vercel.app",
    area: "id",
  },
];

export const featuredProjects = projects.filter((p) => p.category === "Destacado");
