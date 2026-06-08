import { e as createComponent, k as renderComponent, r as renderTemplate } from '../../chunks/astro/server_C2iRGO63.mjs';
import 'piccolore';
import { $ as $$Layout } from '../../chunks/Layout_CsKb6_WZ.mjs';
import { $ as $$Navbar } from '../../chunks/Navbar_Bwy2egbE.mjs';
import { $ as $$HeroAreaIndividual } from '../../chunks/HeroAreaIndividual_CIQNpAl5.mjs';
import { p as projects } from '../../chunks/projects_llmFszin.mjs';
export { renderers } from '../../renderers.mjs';

const $$Acadmica = createComponent(($$result, $$props, $$slots) => {
  const whatWeLookForData = [
    "Estudiantes con ganas de compartir conocimientos, experiencias y estrategias de estudio.",
    "Personas interesadas en participar en la creaci\xF3n de material acad\xE9mico como resoluciones de ex\xE1menes, clases grabadas, gu\xEDas y otros recursos de apoyo.",
    "Estudiantes con disposici\xF3n para apoyar en asesor\xEDas acad\xE9micas y actividades formativas.",
    "Personas motivadas en colaborar en talleres, cursos, ponencias y actividades extracurriculares.",
    "Estudiantes interesados en aprender y participar en la gesti\xF3n de eventos y actividades acad\xE9micas, desde la planificaci\xF3n, ideaci\xF3n y organizaci\xF3n, hasta el control y ejecuci\xF3n de las mismas."
  ];
  const weValueData = [
    "Actitud colaborativa y vocaci\xF3n de apoyo.",
    "Responsabilidad y compromiso con las actividades asumidas.",
    "Capacidad para explicar desde la experiencia estudiantil.",
    "Inter\xE9s por mejorar el acceso a material acad\xE9mico para otros estudiantes.",
    "Disposici\xF3n para trabajar en equipo y aprender continuamente."
  ];
  const whatYouWinData = [
    "Un espacio para aportar, aprender y crecer acad\xE9micamente.",
    "Experiencia en creaci\xF3n de contenido acad\xE9mico y trabajo colaborativo.",
    "Oportunidad de impactar positivamente en la formaci\xF3n de otros estudiantes.",
    "Participaci\xF3n activa en un \xE1rea que busca mejorar la experiencia acad\xE9mica universitaria."
  ];
  const projectsData = projects.filter((p) => p.area === "acd");
  const directorsData = [
    {
      name: "Franz Nu\xF1ez",
      linkedin: "https://www.linkedin.com/in/franz-pool-nu%C3%B1ez-villazana/",
      imageSrc: "/areas/AreasImages/Franz_Nu\xF1ez.webp"
    },
    {
      name: "Marco Gomez",
      linkedin: "https://www.linkedin.com/in/marco-sebastian-gomez-felix-00a974361/",
      imageSrc: "/areas/AreasImages/marco_gomez.webp"
    }
  ];
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Acad\xE9mica | \xC1reas UNICODE" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "Navbar", $$Navbar, {})} ${renderComponent($$result2, "HeroAreaIndividual", $$HeroAreaIndividual, { "title": "Acad\xE9mica", "description": "El \xC1rea Acad\xE9mica planifica y ejecuta iniciativas orientadas al fortalecimiento de la formaci\xF3n universitaria. Su labor se centra en brindar apoyo acad\xE9mico curricular y extracurricular, promoviendo espacios de acompa\xF1amiento, orientaci\xF3n y refuerzo que contribuyan a \r\n        mejorar el rendimiento estudiantil y disminuir las dificultades presentes en los cursos. Asimismo, impulsa actividades de formaci\xF3n complementaria que permiten desarrollar competencias t\xE9cnicas y habilidades profesionales, enfocadas en mejorar el desempe\xF1o acad\xE9mico de los estudiantes. Tambi\xE9n promueve la creaci\xF3n y difusi\xF3n de recursos educativos que ampl\xEDan el acceso al conocimiento y fomentan el aprendizaje continuo, consolidando as\xED una cultura de excelencia, compromiso y crecimiento acad\xE9mico permanente.", "whatWeLookFor": whatWeLookForData, "weValue": weValueData, "whatYouWin": whatYouWinData, "projects": projectsData, "directors": directorsData })} ` })}`;
}, "C:/Users/JEANPIER/Desktop/Unicode/src/pages/areas/acad\xE9mica.astro", void 0);

const $$file = "C:/Users/JEANPIER/Desktop/Unicode/src/pages/areas/académica.astro";
const $$url = "/areas/académica";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    default: $$Acadmica,
    file: $$file,
    url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
