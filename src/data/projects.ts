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
  status: "Activo" | "Inactivo";
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
    title: "UNIOpenCourse 25-2",
    description: "Grabación de las clases dictadas presencialmente en la FIIS para ponerlas a disposición de la comunidad universitaria.",
    longDescription: "UNIOpenCourse 25-2 es una iniciativa de UNICODE inspirada en el modelo del MIT para democratizar el acceso al conocimiento. El proyecto consiste en la grabación sistemática de clases presenciales en la FIIS, publicándolas de forma abierta para que estudiantes de toda la comunidad puedan consultar temas clave como Cálculo, Álgebra y Sistemas Operativos de manera gratuita y accesible.",
    status: "Inactivo",
    faculty: "ACD",
    image: "/projects/thumbnails/UNIOPENCOURSE-thumbnail.jpg",
    screenshots: [
      "/projects/screenshots/uniopencourse-screenshoot1.jpg",
      "/projects/screenshots/uniopencourse-screenshoot2.jpg"
    ],
    team: [
      { name: "Alexis Garay", linkedin: "alexisgarayyovera", image: "/projects/team/Alexis_Garay.jpg" },
      { name: "Jean Paul Beltran", linkedin: "jean-beltran", image: "/projects/team/Jean_Paul_Beltran.jpg" },
      { name: "Jeanpier Robles", linkedin: "jeanpier-robles/", image: "/AreasImages/Jeanpier_Robles.png" },
      { name: "Renato Gutierrez", linkedin: "renato-gutierrez", image: "/AreasImages/Renato_Gutierrez.png" },
      { name: "Gino Romero", linkedin: "gino-romero-osorio-8438a2274", image: "/AreasImages/Gino_Romero.png" },
      { name: "Franz Nuñez", linkedin: "franz-pool-nuñez-villazana", image: "/AreasImages/Franz_Nuñez.png" },
      { name: "Roy Farid", linkedin: "roy-farid-puris-ricaldi-95638233a/", image: "/home-img1.png" },
      { name: "Marco Gómez", linkedin: "marco-sebastian-gomez-felix-00a974361/", image: "/home-img1.png" },
    ],
    link: "https://www.youtube.com/@ccunicode",
    area: "acd",
  },
  {
    id: 2,
    title: "EducaTech",
    description: "Ejecución de una estrategia de contenidos 'Edu-Tech' en redes sociales.",
    longDescription: "EducaTech es una iniciativa enfocada en la creación y difusión de contenido educativo tecnológico a través de redes sociales, buscando acercar la tecnología a toda la comunidad estudiantil de forma dinámica.",
    status: "Activo",
    faculty: "DCC",
    image: "/projects/thumbnails/edutech.jpg",
    screenshots: ["/areasmoment.png"],
    team: teamMock,
    link: "https://unicode.vercel.app",
    area: "dcc",
  },
  {
    id: 3,
    title: "Unicode on Air",
    description: "Producción de contenido audiovisual basado en la interacción presencial en el campus.",
    longDescription: "Proyecto dedicado a capturar la esencia de la vida universitaria y la tecnología mediante entrevistas e interacciones en vivo con los estudiantes dentro del campus de la UNI.",
    status: "Activo",
    faculty: "DCC",
    image: "/projects/thumbnails/unicode_on_air.jpg",
    screenshots: ["/areasmoment.png"],
    team: teamMock,
    link: "https://unicode.vercel.app",
    area: "dcc",
  },
  {
    id: 4,
    title: "Backstage FIIS",
    description: "Serie de vlogs documentales que narran la 'experiencia del estudiante' en la facultad.",
    longDescription: "Una mirada íntima a lo que sucede detrás de cámaras en la FIIS, mostrando el día a día, los retos académicos y la cultura estudiantil a través de vlogs documentales.",
    status: "Activo",
    faculty: "DCC",
    image: "/projects/thumbnails/backstage_fiis.jpg",
    screenshots: ["/areasmoment.png"],
    team: teamMock,
    link: "https://unicode.vercel.app",
    area: "dcc",
  },
  {
    id: 5,
    title: "Unicode Quizzes",
    description: "Estrategia de gamificación digital utilizando principalmente redes sociales.",
    longDescription: "Fomentamos el aprendizaje y la interacción mediante trivias y retos tecnológicos gamificados, aprovechando las plataformas digitales para crear una comunidad más participativa.",
    status: "Activo",
    faculty: "DCC",
    image: "/projects/thumbnails/unicode_quizzes.jpg",
    screenshots: ["/areasmoment.png"],
    team: teamMock,
    link: "https://unicode.vercel.app",
    area: "dcc",
  },
  {
    id: 6,
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
    id: 7,
    title: "Editorial Unicode",
    description: "Producción enfocada en la transcripción y formateo de material académico a LaTeX.",
    longDescription: "Digitalización y estandarización de material de estudio, solucionarios y guías académicas utilizando LaTeX para garantizar la máxima calidad editorial para los estudiantes.",
    status: "Activo",
    faculty: "DCC",
    image: "/projects/thumbnails/editorial_unicode.jpg",
    screenshots: ["/areasmoment.png"],
    team: teamMock,
    link: "https://unicode.vercel.app",
    area: "dcc",
  },
  {
    id: 8,
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
    id: 9,
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
    id: 10,
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
    id: 11,
    title: "TrikaWeb",
    description: "¿Planchas y reseñas? Todo en un solo lugar. La experiencia de generaciones, organizada para que estudies mejor y evites la trika.",
    longDescription: "TrikaWeb es la plataforma diseñada para optimizar el rendimiento académico en la UNI. Centraliza años de experiencia estudiantil en un repositorio organizado de 'planchas' (exámenes resueltos) y reseñas de profesores. Su objetivo es democratizar la información académica, ofreciendo guías estratégicas que facilitan la preparación para las evaluaciones más exigentes.",
    status: "Inactivo",
    faculty: "ID",
    image: "/projects/thumbnails/trikaweb-thumbnail.png",
    screenshots: ["/projects/screenshots/trikaweb/screen1.png", "/projects/screenshots/trikaweb/screen2.png"],
    team: [
      { name: "Hector Yampufe", linkedin: "hector-yampufe", image: "/projects/team/hector-yampufe.jpg" },
      { name: "Jeanpier Robles", linkedin: "jeanpier-robles/", image: "/AreasImages/Jeanpier_Robles.png" },
      { name: "Alexis Garay", linkedin: "alexisgarayyovera", image: "/projects/team/Alexis_Garay.jpg" },
      { name: "Jean Paul Beltran", linkedin: "jean-beltran", image: "/projects/team/Jean_Paul_Beltran.jpg" },
    ],
    link: "https://trikaweb.ccunicode.org/",
    area: "id",
  },
];

export const featuredProjects = projects.filter((p) => p.category === "Destacado");
