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
  image: "",
});

export const projects: Project[] = [
  {
    id: 1,
    title: "UniOpenCourse",
    description: "Plataforma web diseñada para la difusión del contenido de las clases presenciales de la FIIS grabadas por Unicode.",
    longDescription: "El proyecto UNIOpenCourse 25-2, impulsado por Unicode, es una plataforma digital que democratiza el acceso al conocimiento mediante la centralización y organización de las clases grabadas en la Facultad de Ingeniería Industrial y de Sistemas. Inspirada en modelos de educación abierta como el MIT OpenCourseWare, la herramienta ofrece una experiencia de aprendizaje estructurada que incluye el acceso a evaluaciones, recomendaciones personalizadas basadas en el perfil del usuario y funcionalidades colaborativas para la donación de materiales y reportes de contenido. Al integrar la producción académica con un entorno interactivo y herramientas de gestión interna, la plataforma no solo actúa como un repositorio eficiente, sino que consolida una iniciativa innovadora que beneficia tanto a la comunidad universitaria como al público externo interesado en fortalecer su formación académica.",
    status: "Activo",
    faculty: "ID",
    category: "Destacado",
    image: "/projects/thumbnails/uniopencourse_platform_thumbnail.webp",
    screenshots: [
      "/projects/screenshots/uniopencourse_screenshoot1.jpg",
      "/projects/screenshots/uniopencourse_screenshoot2.jpg"
    ],
    team: [
      { name: "Franz Nuñez", linkedin: "franz-pool-nuñez-villazana", image: "/areas/AreasImages/Franz_Nuñez.webp" },
      { name: "Jose Luis Canchanya", linkedin: "jose-luis-canchanya-ramos-b75715200", image: "/projects/team/Jose_Luis_Canchanya.jpg" },
      { name: "Leonardo Chavez", linkedin: "", image: "" },
      { name: "Jeferson Yataco", linkedin: "jeferson-snyder-yataco-huasasquiche-3b048a36b", image: "/projects/team/Jeferson_Yataco.jpg" },
    ],
    link: "https://www.youtube.com/@ccunicode",
    area: "acd",
  },
  {
    id: 9,
    title: "Unicore",
    description: "Unicore es un sistema interno para organizar miembros, áreas, proyectos y tareas dentro de UNICODE.",
    longDescription: "Unicore nace como una solución para centralizar la gestión interna de UNICODE, ya que el seguimiento de miembros, proyectos y tareas puede dispersarse entre distintas herramientas y procesos manuales. La propuesta busca ordenar esa operación en una sola plataforma, permitiendo gestionar áreas, registrar miembros, crear proyectos, asignar equipos y dar seguimiento al trabajo mediante tareas y fases. En su primera versión, el enfoque está en cubrir la base operativa mínima para que la organización funcione con mayor claridad, trazabilidad y control. A largo plazo, Unicore apunta a mejorar la coordinación interna, la visibilidad del avance y la toma de decisiones.",
    status: "Activo",
    faculty: "ID",
    image: "/projects/thumbnails/unicore_thumbnail.jpg",
    screenshots: [
      "/projects/screenshots/unicore_screenshoot1.jpg",
      "/projects/screenshots/unicore_screenshoot2.jpg",
    ],
    team: [
      { name: "Alexis Garay", linkedin: "alexisgarayyovera", image: "/projects/team/Alexis_Garay.webp" },
      { name: "Hector Yampufe", linkedin: "hector-yampufe-664b2a303/", image: "/projects/team/hector-yampufe.webp" },
      { name: "Alejandro Velarde", linkedin: "alejandro-velarde-timoteo-815784368", image: "" },
      { name: "Sandro Chavez", linkedin: "sandro-chavez-vica%C3%B1a-758049281", image: "/projects/team/Sandro_Chavez.jpg" },
    ],
    link: "https://unicode.vercel.app",
    area: "id",
  },
  {
    id: 2,
    title: "EducaTech",
    description: "Ejecución de una estrategia de contenidos 'Edu-Tech' en redes sociales.",
    longDescription: "EducaTech es una iniciativa enfocada en la creación y difusión de contenido educativo tecnológico a través de redes sociales, buscando acercar la tecnología a toda la comunidad estudiantil de forma dinámica.",
    status: "Inactivo",
    faculty: "DCC",
    image: "/projects/thumbnails/edutech.webp",
    screenshots: ["/areasmoment.webp"],
    team: [
      { name: "Paul Albino", linkedin: "paul-albino", image: "" },
      { name: "Fabiola Berrospi", linkedin: "", image: "" },
      { name: "Carlos Vilchez", linkedin: "carlos-vilchez", image: "" },
      { name: "Marcelo Eche", linkedin: "marcelo-fernando-eche-luna-victoria/?skipRedirect=true", image: "/projects/team/Marcelo_Eche.jpg" },
      { name: "Oscar Castañeda", linkedin: "oscar-castaneda", image: "" },
    ],
    link: "https://unicode.vercel.app",
    area: "dcc",
  },
  {
    id: 3,
    title: "Unicode on Air",
    description: "Producción de contenido audiovisual basado en la interacción presencial en el campus.",
    longDescription: "Proyecto dedicado a capturar la esencia de la vida universitaria y la tecnología mediante entrevistas e interacciones en vivo con los estudiantes dentro del campus de la UNI.",
    status: "Inactivo",
    faculty: "DCC",
    image: "/projects/thumbnails/unicode_on_air.webp",
    screenshots: ["/areasmoment.webp"],
    team: [
      { name: "Paul Albino", linkedin: "paul-albino", image: "" },
      { name: "Fabiola Berrospi", linkedin: "", image: "" },
      { name: "Carlos Vilchez", linkedin: "carlos-vilchez", image: "" },
      { name: "Marcelo Eche", linkedin: "marcelo-fernando-eche-luna-victoria/?skipRedirect=true", image: "/projects/team/Marcelo_Eche.jpg" },
      { name: "Oscar Castañeda", linkedin: "oscar-castaneda", image: "" },
    ],
    link: "https://unicode.vercel.app",
    area: "dcc",
  },
  {
    id: 4,
    title: "Backstage FIIS",
    description: "Serie de vlogs documentales que narran la 'experiencia del estudiante' en la facultad.",
    longDescription: "Una mirada íntima a lo que sucede detrás de cámaras en la FIIS, mostrando el día a día, los retos académicos y la cultura estudiantil a través de vlogs documentales.",
    status: "Inactivo",
    faculty: "DCC",
    image: "/projects/thumbnails/backstage_fiis.webp",
    screenshots: ["/areasmoment.webp"],
    team: [
      { name: "Paul Albino", linkedin: "paul-albino", image: "" },
      { name: "Fabiola Berrospi", linkedin: "", image: "" },
      { name: "Carlos Vilchez", linkedin: "carlos-vilchez", image: "" },
      { name: "Marcelo Eche", linkedin: "marcelo-fernando-eche-luna-victoria/?skipRedirect=true", image: "/projects/team/Marcelo_Eche.jpg" },
      { name: "Oscar Castañeda", linkedin: "oscar-castaneda", image: "" },
    ],
    link: "https://unicode.vercel.app",
    area: "dcc",
  },
  {
    id: 5,
    title: "Unicode Quizzes",
    description: "Estrategia de gamificación digital utilizando principalmente redes sociales.",
    longDescription: "Fomentamos el aprendizaje y la interacción mediante trivias y retos tecnológicos gamificados, aprovechando las plataformas digitales para crear una comunidad más participativa.",
    status: "Inactivo",
    faculty: "DCC",
    image: "/projects/thumbnails/unicode_quizzes.webp",
    screenshots: ["/areasmoment.webp"],
    team: [
      { name: "Paul Albino", linkedin: "paul-albino", image: "" },
      { name: "Fabiola Berrospi", linkedin: "", image: "" },
      { name: "Carlos Vilchez", linkedin: "carlos-vilchez", image: "" },
      { name: "Marcelo Eche", linkedin: "marcelo-fernando-eche-luna-victoria/?skipRedirect=true", image: "/projects/team/Marcelo_Eche.jpg" },
      { name: "Oscar Castañeda", linkedin: "oscar-castaneda", image: "" },
    ],
    link: "https://unicode.vercel.app",
    area: "dcc",
  },
  {
    id: 6,
    title: "Unicode Podcast",
    description: "Producción de contenido long-form para YouTube con clips para redes sociales.",
    longDescription: "Espacio de conversación profunda sobre tecnología, carrera profesional y vida universitaria, distribuido en episodios completos en YouTube y condensado en clips de alto impacto.",
    status: "Inactivo",
    faculty: "DCC",
    image: "/projects/thumbnails/unicode_podcast_thumbnail.jpg",
    screenshots: ["/areasmoment.webp"],
    team: [
      { name: "Diego Larico", linkedin: "diego-larico-cruz", image: "/areas/AreasImages/Diego_Larico.webp" },
      { name: "Andhlé Campos", linkedin: "andhle-campos-castillo-081a47311", image: "/areas/AreasImages/Andhlé_Campos.webp" },
      { name: "Jeanpier Robles", linkedin: "jeanpier-robles", image: "/areas/AreasImages/Jeanpier_Robles.webp" },
      { name: "Rafael Olivos", linkedin: "rafael-olivos-g", image: "/areas/AreasImages/Rafael_Olivos.webp" },
      { name: "Franz Nuñez", linkedin: "franz-pool-nuñez-villazana", image: "/areas/AreasImages/Franz_Nuñez.webp" },
      { name: "Marco Gomez", linkedin: "marco-sebastian-gomez-felix-00a974361", image: "/areas/AreasImages/marco_gomez.webp" },
      { name: "Renato Gutierrez", linkedin: "renato-gutierrez", image: "/areas/AreasImages/Renato_Gutierrez.webp" },
      { name: "Rubí Quispe", linkedin: "rubi-quispe-sierra", image: "/areas/AreasImages/Rubi_Quispe.webp" },
      { name: "Lenin Castro", linkedin: "lenincastro", image: "/areas/AreasImages/Lenin_Castro.webp" },
      { name: "Gabriel Chupa", linkedin: "gabriel-chupa-ballesteros", image: "/areas/AreasImages/Gabriel_Chupa.webp" },
    ],
    link: "https://unicode.vercel.app",
    area: "dcc",
  },
  {
    id: 7,
    title: "Editorial Unicode",
    description: "Producción enfocada en la transcripción y formateo de material académico a LaTeX.",
    longDescription: "Digitalización y estandarización de material de estudio, solucionarios y guías académicas utilizando LaTeX para garantizar la máxima calidad editorial para los estudiantes.",
    status: "Inactivo",
    faculty: "DCC",
    image: "/projects/thumbnails/editorial_unicode.webp",
    screenshots: ["/areasmoment.webp"],
    team: [
      { name: "María Gabriela Jorge", linkedin: "maria-gabriela-trinidad-jorge-quispe/?skipRedirect=true", image: "/projects/team/Maria_Gabriela_Jorge.jpg" },
      { name: "Korelly Araujo", linkedin: "yoissy-alina-korelly-araujo-escobar/", image: "/projects/team/Korelly_Araujo.jpg" },
      { name: "Anghely Vargas", linkedin: "anghely-anai-vargas-canchan-743154386/?skipRedirect=true", image: "/projects/team/Anghely_Vargas.jpg" },
      { name: "Hector Yampufe", linkedin: "hector-yampufe-664b2a303/", image: "/projects/team/hector-yampufe.webp" },
    ],
    link: "https://unicode.vercel.app",
    area: "dcc",
  },
  {
    id: 8,
    title: "Revista Unicode",
    description: "Difusión de noticias tecnológicas y actualizaciones de la comunidad.",
    longDescription: "Publicación periódica que recopila lo último en innovación, eventos de la comunidad y artículos técnicos de interés para el ecosistema tecnológico de la facultad.",
    status: "Inactivo",
    faculty: "DCC",
    image: "/projects/thumbnails/revista_unicode_thumbnail.jpg",
    screenshots: ["/areasmoment.webp"],
    team: [
      { name: "María Gabriela Jorge", linkedin: "maria-gabriela-trinidad-jorge-quispe/?skipRedirect=true", image: "/projects/team/Maria_Gabriela_Jorge.jpg" },
      { name: "Korelly Araujo", linkedin: "yoissy-alina-korelly-araujo-escobar/", image: "/projects/team/Korelly_Araujo.jpg" },
      { name: "Anghely Vargas", linkedin: "anghely-anai-vargas-canchan-743154386/?skipRedirect=true", image: "/projects/team/Anghely_Vargas.jpg" },
      { name: "Hector Yampufe", linkedin: "hector-yampufe-664b2a303/", image: "/projects/team/hector-yampufe.webp" },
    ],
    link: "https://unicode.vercel.app",
    area: "dcc",
  },

  {
    id: 10,
    title: "TrikaWeb",
    description: "Web que centraliza solucionarios y exámenes pasados de la Facultad de Ingeniería Industrial y Sistemas de la UNI",
    longDescription: "TrikaWeb es una página web integral diseñada para optimizar el rendimiento académico de los estudiantes de la Facultad de Ingeniería Industrial y de Sistemas (FIIS) de la UNI. El proyecto surge como una solución a la dispersión de recursos educativos, centralizando en un solo lugar material indispensable como prácticas calificadas, parciales, finales y exámenes sustitutorios",
    status: "Activo",
    faculty: "ID",
    category: "Destacado",
    image: "/projects/thumbnails/trikaweb_thumbnail_correct.webp",
    imagePosition: "center",
    screenshots: ["/projects/screenshots/trikaweb-screenshoot1.png", "/projects/screenshots/trikaweb-screenshoot2.png"],
    team: [
      { name: "Alexis Garay", linkedin: "alexisgarayyovera", image: "/projects/team/Alexis_Garay.webp" },
      { name: "Diego Pinedo", linkedin: "diego-pinedo-998ab1351", image: "/projects/team/Diego_Pinedo.jpg" },
      { name: "Jeanpier Robles", linkedin: "jeanpier-robles/", image: "/areas/AreasImages/Jeanpier_Robles.webp" },
      { name: "Jean Paul Beltran", linkedin: "jean-beltran", image: "/projects/team/Jean_Paul_Beltran.webp" },
      { name: "Gabriel Eustaquio", linkedin: "luis-gabriel-eustaquio-avila-a473b3347", image: "" },
      { name: "John Tucto", linkedin: "john-tucto-386b3a1b8", image: "/projects/team/John_Tucto.jpg" },
      { name: "Hector Yampufe", linkedin: "hector-yampufe-664b2a303/", image: "/projects/team/hector-yampufe.webp" },
    ],
    link: "https://trikaweb.ccunicode.org/",
    area: "id",
  },
  {
    id: 11,
    title: "Landing Page Unicode",
    description: "Web que concentra toda la información y alma de unicode",
    longDescription: "El presente proyecto consiste en la creación de una landing page para el centro cultural Unicode, concebido como un espacio que promueve la integración entre arte, cultura y tecnología. La página tiene como finalidad principal servir como una vitrina digital que permita dar a conocer las actividades, eventos, talleres y la identidad del centro cultural, generando una conexión directa con el público y fomentando su participación.En cuanto a las tecnologías utilizadas, se emplea HTML, TypeScript y Astro.",
    status: "Activo",
    faculty: "ID",
    category: "Destacado",
    image: "/projects/thumbnails/Landingpage_thumbnail.webp",
    screenshots: ["/projects/screenshots/Landingpage-screenshoot1.webp", "/projects/screenshots/Landingpage-screenshoot2.webp"],
    team: [
      { name: "Jeanpier Robles", linkedin: "jeanpier-robles", image: "/projects/team/Jeanpier_Robles.webp" },
      { name: "Leonel Cruzado", linkedin: "leonel-cruzado", image: "/projects/team/Leonel_Cruzado.webp" },
      { name: "Renato Gutierrez", linkedin: "renato-gutierrez", image: "/projects/team/Renato_Gutierrez.webp" },
      { name: "Luis Paucar", linkedin: "luis-antonio-paucar-ventura-6b7304381", image: "/projects/team/Luis_Paucar.webp" },
      { name: "José", linkedin: "jean-beltran", image: "/projects/team/h.webp" },
    ],
    link: "https://ccunicode.org/",
    area: "id",
  },
];

export const featuredProjects = projects.filter((p) => p.category === "Destacado");
