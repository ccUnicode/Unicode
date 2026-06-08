import { e as createComponent, k as renderComponent, r as renderTemplate } from '../../chunks/astro/server_C2iRGO63.mjs';
import 'piccolore';
import { $ as $$Layout } from '../../chunks/Layout_CfJX6JHL.mjs';
import { $ as $$Navbar } from '../../chunks/Navbar_CBjdAvp7.mjs';
import { $ as $$HeroAreaIndividual } from '../../chunks/HeroAreaIndividual_DUhwp0mK.mjs';
import { p as projects } from '../../chunks/projects_llmFszin.mjs';
export { renderers } from '../../renderers.mjs';

const $$DireccinDeComunicacinYContenido = createComponent(($$result, $$props, $$slots) => {
  const whatWeLookForData = [
    "Estudiantes responsables y comprometidos (lo m\xE1s importante).",
    "Apoyo en cobertura de eventos: fotos, clips, highlights y res\xFAmenes.",
    "Tener inter\xE9s en branding e identidad visual: afiches, plantillas, banners y piezas de difusi\xF3n.",
    "Ser innovador y creativo para proponer ideas, trabajar en equipo y liderar proyectos."
  ];
  const weValueData = [
    "Conocimiento y manejo experto de Canva.",
    "Conocimiento en herramientas de edici\xF3n de im\xE1genes como Illustrator y Photoshop.",
    "Conocimiento en herramientas de edici\xF3n de video como Filmora y CapCut."
  ];
  const whatYouWinData = [
    "Experiencia real en creaci\xF3n de contenido y comunicaci\xF3n.",
    "Aprendizaje pr\xE1ctico y trabajo colaborativo.",
    "Participaci\xF3n en proyectos y eventos con impacto en la comunidad.",
    "En caso hayas ingresado al \xE1rea sin conocimientos previos, te ir\xE1s con muchos saberes con respecto a dise\xF1o, branding y marketing."
  ];
  const projectsData = projects.filter((p) => p.area === "dcc");
  const directorsData = [
    {
      name: "Renato Gutierrez",
      linkedin: "https://www.linkedin.com/in/renato-gutierrez/",
      imageSrc: "/areas/AreasImages/Renato_Gutierrez.webp"
    },
    {
      name: "Rub\xED Quispe",
      linkedin: "https://www.linkedin.com/in/rubi-quispe-sierra/",
      imageSrc: "/areas/AreasImages/Rubi_Quispe.webp"
    }
  ];
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Direcci\xF3n de Comunicaci\xF3n y Contenido | \xC1reas UNICODE" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "Navbar", $$Navbar, {})} ${renderComponent($$result2, "HeroAreaIndividual", $$HeroAreaIndividual, { "title": "Direcci\xF3n de Comunicaci\xF3n y Contenido", "description": "La Direcci\xF3n de Comunicaci\xF3n y Contenido (DCC) es el motor creativo encargado de traducir el conocimiento t\xE9cnico de UNICODE en un mensaje claro y de alto impacto. Su labor se centra en dise\xF1ar y ejecutar estrategias integrales de marketing, edici\xF3n audiovisual y redacci\xF3n editorial que fortalezcan el posicionamiento de la organizaci\xF3n. Asimismo, asegura la difusi\xF3n efectiva de eventos, solucionarios y proyectos tecnol\xF3gicos para mantener a la comunidad informada y conectada. Tambi\xE9n potencia las habilidades t\xE9cnicas y de creaci\xF3n de contenido de sus miembros, form\xE1ndolos como verdaderos embajadores de marca. Finalmente, transforma conceptos acad\xE9micos complejos en recursos educativos valiosos que enriquecen el ecosistema estudiantil.", "whatWeLookFor": whatWeLookForData, "weValue": weValueData, "whatYouWin": whatYouWinData, "projects": projectsData, "directors": directorsData })} ` })}`;
}, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/pages/areas/direcci\xF3n-de-comunicaci\xF3n-y-contenido.astro", void 0);

const $$file = "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/pages/areas/dirección-de-comunicación-y-contenido.astro";
const $$url = "/areas/dirección-de-comunicación-y-contenido";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    default: $$DireccinDeComunicacinYContenido,
    file: $$file,
    url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
