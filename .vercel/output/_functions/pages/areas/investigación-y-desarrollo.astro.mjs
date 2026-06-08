import { e as createComponent, k as renderComponent, r as renderTemplate } from '../../chunks/astro/server_C2iRGO63.mjs';
import 'piccolore';
import { $ as $$Layout } from '../../chunks/Layout_CfJX6JHL.mjs';
import { $ as $$Navbar } from '../../chunks/Navbar_CBjdAvp7.mjs';
import { $ as $$HeroAreaIndividual } from '../../chunks/HeroAreaIndividual_DUhwp0mK.mjs';
import { p as projects } from '../../chunks/projects_llmFszin.mjs';
export { renderers } from '../../renderers.mjs';

const $$InvestigacinYDesarrollo = createComponent(($$result, $$props, $$slots) => {
  const whatWeLookForData = [
    "Estudiantes apasionados por la tecnolog\xEDa, la programaci\xF3n y la innovaci\xF3n.",
    "Mentes curiosas con ganas de investigar y aprender nuevas herramientas de desarrollo.",
    "Capacidad para resolver problemas l\xF3gicos y proponer soluciones creativas.",
    "Compromiso para trabajar en proyectos colaborativos."
  ];
  const weValueData = [
    "Conocimientos b\xE1sicos de control de versiones (Git/GitHub).",
    "Inter\xE9s en \xE1reas como Desarrollo Web, M\xF3vil, Ciencia de Datos o Inteligencia Artificial.",
    "Nociones de algoritmos y estructura de datos."
  ];
  const whatYouWinData = [
    "Participaci\xF3n en proyectos reales de software y hardware.",
    "Espacio para experimentar con nuevas tecnolog\xEDas sin miedo a equivocarse.",
    "Mentor\xEDa t\xE9cnica de miembros experimentados.",
    "Networking con personas afines al desarrollo."
  ];
  const projectsData = projects.filter((p) => p.area === "id");
  const directorsData = [
    {
      name: "Lenin Castro",
      linkedin: "https://www.linkedin.com/in/lenincastro/",
      imageSrc: "/areas/AreasImages/Lenin_Castro.webp"
    },
    {
      name: "Gabriel Chupa",
      linkedin: "https://www.linkedin.com/in/gabriel-chupa-ballesteros/",
      imageSrc: "/areas/AreasImages/Gabriel_Chupa.webp"
    }
  ];
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Investigaci\xF3n y Desarrollo | \xC1reas UNICODE" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "Navbar", $$Navbar, {})} ${renderComponent($$result2, "HeroAreaIndividual", $$HeroAreaIndividual, { "title": "Investigaci\xF3n y Desarrollo", "description": "En el \xE1rea de Investigaci\xF3n y Desarrollo transformamos ideas en c\xF3digo y soluciones reales. Somos el equipo encargado de desarrollar la tecnolog\xEDa de Unicode, impulsando proyectos y soluciones t\xE9cnicas que fomentan la innovaci\xF3n y convierten conceptos en resultados concretos.", "whatWeLookFor": whatWeLookForData, "weValue": weValueData, "whatYouWin": whatYouWinData, "projects": projectsData, "directors": directorsData })} ` })}`;
}, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/pages/areas/investigaci\xF3n-y-desarrollo.astro", void 0);

const $$file = "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/pages/areas/investigación-y-desarrollo.astro";
const $$url = "/areas/investigación-y-desarrollo";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    default: $$InvestigacinYDesarrollo,
    file: $$file,
    url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
