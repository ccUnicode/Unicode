import { e as createComponent, k as renderComponent, r as renderTemplate } from '../../chunks/astro/server_C2iRGO63.mjs';
import 'piccolore';
import { $ as $$Layout } from '../../chunks/Layout_CsKb6_WZ.mjs';
import { $ as $$Navbar } from '../../chunks/Navbar_Bwy2egbE.mjs';
import { $ as $$HeroAreaIndividual } from '../../chunks/HeroAreaIndividual_CIQNpAl5.mjs';
import { p as projects } from '../../chunks/projects_llmFszin.mjs';
export { renderers } from '../../renderers.mjs';

const $$RelacionesPblicas = createComponent(($$result, $$props, $$slots) => {
  const whatWeLookForData = [
    "Estudiantes comprometidos a avanzar con las tareas designadas para la correcta ejecuci\xF3n de los eventos de Unicode.",
    "Personas con inter\xE9s en aprender sobre relaciones p\xFAblicas, alianzas estrat\xE9gicas y networking.",
    "Estudiantes proactivos y con ganas de llevar adelante los proyectos.",
    "Personas resilientes y persistentes ante las adversidades.",
    "Buena comunicaci\xF3n escrita y verbal para la coordinaci\xF3n con empresas y ponentes."
  ];
  const weValueData = [
    "Facilidad de palabra y desenvolvimiento.",
    "Inter\xE9s en el ecosistema tecnol\xF3gico y startups.",
    "Capacidad de organizaci\xF3n y seguimiento de acuerdos."
  ];
  const whatYouWinData = [
    "Desarrollo de una red de contactos profesional (Networking).",
    "Experiencia real negociando con empresas y gestionando alianzas.",
    "Mejora considerable de tus habilidades blandas y comunicaci\xF3n efectiva.",
    "Acceso directo a eventos y oportunidades exclusivas."
  ];
  const projectsData = projects.filter((p) => p.area === "rrpp");
  const directorsData = [
    {
      name: "Jeanpier Robles",
      linkedin: "https://www.linkedin.com/in/jeanpier-robles/",
      imageSrc: "/areas/AreasImages/Jeanpier_Robles.webp"
    },
    {
      name: "Rafael Olivos",
      linkedin: "https://www.linkedin.com/in/rafael-olivos-g/",
      imageSrc: "/areas/AreasImages/Rafael_Olivos.webp"
    }
  ];
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Relaciones P\xFAblicas | \xC1reas UNICODE" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "Navbar", $$Navbar, {})} ${renderComponent($$result2, "HeroAreaIndividual", $$HeroAreaIndividual, { "title": "Relaciones P\xFAblicas", "description": "El \xC1rea de Relaciones P\xFAblicas gestiona v\xEDnculos estrat\xE9gicos para expandir el impacto de Unicode en el ecosistema tecnol\xF3gico. Su labor se centra en establecer alianzas con empresas y ponentes de alto nivel, facilitando beneficios como becas y convenios que impulsen el crecimiento profesional de la comunidad. Asimismo, promueve la visibilidad de la organizaci\xF3n mediante la cooperaci\xF3n con centros culturales y organizaciones estudiantiles. Tambi\xE9n potencia las habilidades comunicativas y de negociaci\xF3n de sus miembros, permiti\xE9ndoles representar a la instituci\xF3n con profesionalismo ante diversas audiencias. Finalmente, coordina el intercambio de recursos con aliados externos para fortalecer las perspectivas laborales de los futuros ingenieros.", "whatWeLookFor": whatWeLookForData, "weValue": weValueData, "whatYouWin": whatYouWinData, "projects": projectsData, "directors": directorsData })} ` })}`;
}, "C:/Users/JEANPIER/Desktop/Unicode/src/pages/areas/relaciones-p\xFAblicas.astro", void 0);

const $$file = "C:/Users/JEANPIER/Desktop/Unicode/src/pages/areas/relaciones-públicas.astro";
const $$url = "/areas/relaciones-públicas";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    default: $$RelacionesPblicas,
    file: $$file,
    url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
