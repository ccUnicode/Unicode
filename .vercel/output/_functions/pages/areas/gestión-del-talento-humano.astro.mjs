import { e as createComponent, k as renderComponent, r as renderTemplate } from '../../chunks/astro/server_C2iRGO63.mjs';
import 'piccolore';
import { $ as $$Layout } from '../../chunks/Layout_CsKb6_WZ.mjs';
import { $ as $$Navbar } from '../../chunks/Navbar_Bwy2egbE.mjs';
import { $ as $$HeroAreaIndividual } from '../../chunks/HeroAreaIndividual_CIQNpAl5.mjs';
import { p as projects } from '../../chunks/projects_llmFszin.mjs';
export { renderers } from '../../renderers.mjs';

const $$GestinDelTalentoHumano = createComponent(($$result, $$props, $$slots) => {
  const whatWeLookForData = [
    "Estudiantes con ganas de integrarse y ayudar a construir un buen clima organizacional dentro de UNICODE.",
    "Personas interesadas en apoyar la organizaci\xF3n y ejecuci\xF3n de eventos institucionales, culturales, deportivos y de integraci\xF3n.",
    "Estudiantes con disposici\xF3n para colaborar como staff en actividades de distintas \xE1reas del centro cultural.",
    "Personas interesadas en la planificaci\xF3n de actividades recreativas como integraciones, tertulias, salidas grupales, torneos y din\xE1micas.",
    "Estudiantes motivados en participar en la gesti\xF3n de eventos desde la planificaci\xF3n, coordinaci\xF3n, log\xEDstica y ejecuci\xF3n."
  ];
  const weValueData = [
    "Actitud de servicio y disposici\xF3n para apoyar.",
    "Responsabilidad y compromiso con las tareas asumidas.",
    "Buena comunicaci\xF3n y trato cordial con otras personas.",
    "Capacidad para trabajar en equipo y adaptarse a diferentes situaciones.",
    "Iniciativa, proactividad y ganas de aprender."
  ];
  const whatYouWinData = [
    "Un espacio para desarrollarte a nivel personal y organizacional.",
    "Experiencia en gesti\xF3n de eventos, log\xEDstica y trabajo en equipo.",
    "Oportunidad de interactuar con distintas \xE1reas y ampliar tu red de contactos.",
    "Participaci\xF3n activa en actividades que fortalecen la identidad y comunidad UNICODE.",
    "Formaci\xF3n pr\xE1ctica en organizaci\xF3n, coordinaci\xF3n y liderazgo."
  ];
  const projectsData = projects.filter((p) => p.area === "gth");
  const directorsData = [
    {
      name: "Andhl\xE9 Campos",
      linkedin: "https://www.linkedin.com/in/andhle-campos-castillo-081a47311/",
      imageSrc: "/areas/AreasImages/Andhl\xE9_Campos.webp"
    },
    {
      name: "Diego Larico",
      linkedin: "https://www.linkedin.com/in/diego-larico-cruz/",
      imageSrc: "/areas/AreasImages/Diego_Larico.webp"
    }
  ];
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Gesti\xF3n del Talento Humano | \xC1reas UNICODE" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "Navbar", $$Navbar, {})} ${renderComponent($$result2, "HeroAreaIndividual", $$HeroAreaIndividual, { "title": "Gesti\xF3n del Talento Humano", "description": "El \xE1rea de Gesti\xF3n del Talento Humano (GTH) en UNICODE no se limita a la administraci\xF3n de personal; es el motor que impulsa el bienestar y el crecimiento estrat\xE9gico de su comunidad. Su labor fundamental es salvaguardar la armon\xEDa interna, garantizando un entorno seguro donde la integridad f\xEDsica, emocional y moral de cada miembro sea la prioridad. A trav\xE9s de la organizaci\xF3n de espacios de integraci\xF3n, el \xE1rea transforma el compa\xF1erismo en una verdadera confraternidad, fortaleciendo el sentido de pertenencia.", "whatWeLookFor": whatWeLookForData, "weValue": weValueData, "whatYouWin": whatYouWinData, "projects": projectsData, "directors": directorsData })} ` })}`;
}, "C:/Users/JEANPIER/Desktop/Unicode/src/pages/areas/gesti\xF3n-del-talento-humano.astro", void 0);

const $$file = "C:/Users/JEANPIER/Desktop/Unicode/src/pages/areas/gestión-del-talento-humano.astro";
const $$url = "/areas/gestión-del-talento-humano";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    default: $$GestinDelTalentoHumano,
    file: $$file,
    url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
