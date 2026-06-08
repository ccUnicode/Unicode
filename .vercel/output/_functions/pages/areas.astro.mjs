import { e as createComponent, m as maybeRenderHead, g as addAttribute, r as renderTemplate, h as createAstro, k as renderComponent, l as renderScript } from '../chunks/astro/server_C2iRGO63.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_CsKb6_WZ.mjs';
import { $ as $$Navbar } from '../chunks/Navbar_Bwy2egbE.mjs';
import 'clsx';
/* empty css                                 */
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro();
const $$AreaCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$AreaCard;
  const {
    title,
    description,
    directors,
    imageSrc = "https://placehold.co/600x600/18181b/75D32D?text=Im\xE1gen",
    reverse = false
  } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<div${addAttribute(`grid grid-cols-[38%_1fr] md:flex md:flex-row gap-x-4 gap-y-5 md:gap-8 bg-[#151515] rounded-2xl md:rounded-[2rem] p-4 sm:p-5 md:p-6 items-center border border-zinc-800/50 hover:border-unicode/30 transition-all duration-300 group ${reverse ? "md:flex-row-reverse" : ""}`, "class")}> <!-- Contenedor de Imagen --> <div class="w-full aspect-square md:aspect-auto md:w-[25%] xl:w-[22%] max-w-[150px] md:max-w-[280px] flex-shrink-0 md:self-stretch rounded-2xl md:rounded-3xl overflow-hidden border border-transparent md:border-2 group-hover:border-unicode/40 transition-all duration-500 group-hover:shadow-unicode"> <img${addAttribute(imageSrc, "src")}${addAttribute(`Imagen del \xE1rea de ${title}`, "alt")} class="w-full h-full object-cover" loading="lazy"> </div> <!-- Contenedor de Información (Desktop: Todo junto / Móvil: Solo título y desc) --> <div${addAttribute(`flex flex-col justify-center text-left md:py-2 md:w-[75%] xl:w-[78%] ${reverse ? "md:items-end md:text-right" : "md:items-start md:text-left"}`, "class")}> <h3 class="text-[19px] sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-unicode text-glow mb-1 md:mb-4"> ${title} </h3> <p class="text-zinc-300 text-[12px] sm:text-sm md:text-base leading-snug md:leading-relaxed font-normal md:mb-1"> ${description} </p> <!-- Directores y Botón (Oculto en móvil aquí para mantener el flujo de celdas, se mostrará en Desktop) --> <div class="hidden md:flex flex-col w-full mt-5 md:mt-2 xl:mt-4"> <div${addAttribute(`flex gap-4 sm:gap-6 w-full mb-6 mt-5 md:mt-0 ${reverse ? "justify-end" : "justify-start"}`, "class")}> ${directors.map((director) => renderTemplate`<div class="flex items-center gap-2"> <div class="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border border-zinc-700 group-hover:border-unicode/50 transition-colors duration-300 flex-shrink-0"> <img${addAttribute(director.image, "src")}${addAttribute(director.name, "alt")} class="w-full h-full object-cover" loading="lazy"> </div> <div class="flex flex-col leading-tight text-left"> <span class="text-zinc-200 text-xs md:text-sm font-semibold"> ${director.name} </span> ${director.linkedin && renderTemplate`<a${addAttribute(director.linkedin, "href")} target="_blank" rel="noopener noreferrer" class="flex items-center gap-1 text-zinc-400 hover:text-[#0A66C2] transition-colors duration-200 mt-0.5"> <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"> <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"></path> </svg> <span class="text-[10px] md:text-xs">
LinkedIn
</span> </a>`} </div> </div>`)} </div> <a${addAttribute(`/areas/${title.toLowerCase().replace(/\s+/g, "-")}`, "href")}${addAttribute(`bg-unicode text-black font-bold px-8 py-3 rounded-full hover:bg-unicode-light transition-all w-fit text-sm md:text-base shadow-unicode hover:shadow-unicode-lg ${reverse ? "self-end" : ""}`, "class")}>Conoce más</a> </div> </div> <!-- Directores y Botón (Solo visible en Móvil, abarcando 2 columnas en la parte inferior) --> <div class="col-span-2 flex flex-col items-center justify-center w-full mt-2 md:hidden"> <div class="flex flex-wrap gap-4 sm:gap-6 w-full justify-center mb-5"> ${directors.map((director) => renderTemplate`<div class="flex items-center gap-2"> <div class="w-8 h-8 rounded-full overflow-hidden border border-zinc-700 transition-colors duration-300 flex-shrink-0"> <img${addAttribute(director.image, "src")}${addAttribute(director.name, "alt")} class="w-full h-full object-cover" loading="lazy"> </div> <div class="flex flex-col leading-tight text-left"> <span class="text-zinc-200 text-[11px] sm:text-xs font-semibold"> ${director.name} </span> ${director.linkedin && renderTemplate`<a${addAttribute(director.linkedin, "href")} target="_blank" rel="noopener noreferrer" class="flex items-center gap-1 text-zinc-400 hover:text-[#0A66C2] transition-colors duration-200 mt-0.5"> <svg class="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"> <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"></path> </svg> <span class="text-[10px]">LinkedIn</span> </a>`} </div> </div>`)} </div> <a${addAttribute(`/areas/${title.toLowerCase().replace(/\s+/g, "-")}`, "href")} class="bg-unicode text-black font-bold px-6 py-2.5 rounded-full hover:bg-unicode-light transition-all w-fit text-[13px] shadow-unicode">Conoce más</a> </div> </div>`;
}, "C:/Users/JEANPIER/Desktop/Unicode/src/components/components-areas/AreaCard.astro", void 0);

const $$HeroAreas = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<section id="hero-areas-container" class="relative w-full min-h-screen overflow-hidden bg-[#050505] -mt-24 pt-32 md:pt-32" data-astro-cid-yfkkhka3> <!-- 1. Capa de Fondo: Patrón Hexagonal --> <div class="absolute inset-0 z-0 opacity-20 pointer-events-none" style="background-image: radial-gradient(circle at 2px 2px, rgba(117,211,45,0.1) 1px, transparent 0); background-size: 40px 40px;" data-astro-cid-yfkkhka3></div> <div class="absolute inset-0 z-0 opacity-10 pointer-events-none" style="background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MiIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTI2IDBMMDUyIDE1VjQ1TDI2IDYwTDAgNDVWMTVMMjYgMFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxMTcsIDIxMSwgNDUsIDAuMikiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg=='); background-size: 52px 60px;" data-astro-cid-yfkkhka3></div> <!-- 2. Capa de Animación--> <canvas id="areas-plexus" class="absolute inset-0 z-10 pointer-events-none" data-astro-cid-yfkkhka3></canvas> <!-- 3. Viñeta Radial --> <div class="absolute inset-0 z-20 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(5,5,5,0.4)_50%,#050505_100%)]" data-astro-cid-yfkkhka3></div> <!-- Separación, arriba es el diseño plexus (fondo dinámico) --> <!-- Contenido Principal --> <div class="relative z-30 w-full max-w-7xl mx-auto px-6 py-10 md:py-20" data-astro-cid-yfkkhka3> <div class="mb-10 md:mb-20" data-astro-cid-yfkkhka3></div> <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-10 md:mb-20 text-center uppercase animate-lifting" data-astro-cid-yfkkhka3> <span class="text-unicode text-glow" data-astro-cid-yfkkhka3>CONOCE</span> NUESTRAS <span class="text-unicode text-glow" data-astro-cid-yfkkhka3>ÁREAS</span> </h1> <!-- Grid de las cards de áreas --> <div class="flex flex-col gap-8 md:gap-12 text-left animate-lifting" style="animation-delay: 200ms;" data-astro-cid-yfkkhka3> ${renderComponent($$result, "AreaCard", $$AreaCard, { "title": "Gesti\xF3n del Talento Humano", "description": "Somos el \xE1rea encargada de promover el crecimiento profesional, el bienestar y el desarrollo integral de cada uno de los miembros dentro de la familia UNICODE.", "directors": [
    {
      name: "Diego Larico",
      image: "/areas/AreasImages/Diego_Larico.webp",
      linkedin: "https://www.linkedin.com/in/diego-larico-cruz/"
    },
    {
      name: "Andhl\xE9 Campos",
      image: "/areas/AreasImages/Andhl\xE9_Campos.webp",
      linkedin: "https://www.linkedin.com/in/andhle-campos-castillo-081a47311/"
    }
  ], "imageSrc": "/areas/AreasThumbnails/gth-thumbnail.webp", "data-astro-cid-yfkkhka3": true })} ${renderComponent($$result, "AreaCard", $$AreaCard, { "title": "Relaciones P\xFAblicas", "description": "Gestionamos alianzas estrat\xE9gicas con empresas y organizaciones para generar oportunidades, beneficios y becas que impulsen el crecimiento profesional de nuestra comunidad", "directors": [
    {
      name: "Jeanpier Robles",
      image: "/areas/AreasImages/Jeanpier_Robles.webp",
      linkedin: "https://www.linkedin.com/in/jeanpier-robles/"
    },
    {
      name: "Rafael Olivos",
      image: "/areas/AreasImages/Rafael_Olivos.webp",
      linkedin: "https://www.linkedin.com/in/rafael-olivos-g/"
    }
  ], "reverse": true, "imageSrc": "/areas/AreasThumbnails/rrpp-thumbnail.webp", "data-astro-cid-yfkkhka3": true })} ${renderComponent($$result, "AreaCard", $$AreaCard, { "title": "Acad\xE9mica", "description": "Impulsamos iniciativas que fortalecen la calidad educativa mediante apoyo acad\xE9mico, formaci\xF3n complementaria y desarrollo de recursos.", "directors": [
    {
      name: "Franz Nu\xF1ez",
      image: "/areas/AreasImages/Franz_Nu\xF1ez.webp",
      linkedin: "https://www.linkedin.com/in/franz-pool-nu%C3%B1ez-villazana/"
    },
    {
      name: "Marco Gomez",
      image: "/areas/AreasImages/marco_gomez.webp",
      linkedin: "https://www.linkedin.com/in/marco-sebastian-gomez-felix-00a974361/"
    }
  ], "imageSrc": "/areas/AreasThumbnails/acad\xE9mica-thumbnail.webp", "data-astro-cid-yfkkhka3": true })} ${renderComponent($$result, "AreaCard", $$AreaCard, { "title": "Direcci\xF3n de Comunicaci\xF3n y Contenido", "description": "Somos el motor creativo de UNICODE, encargados de traducir el conocimiento t\xE9cnico de la comunidad en mensajes atractivos y de alto impacto.", "directors": [
    {
      name: "Renato Gutierrez",
      image: "/areas/AreasImages/Renato_Gutierrez.webp",
      linkedin: "https://www.linkedin.com/in/renato-gutierrez/"
    },
    {
      name: "Rub\xED Quispe",
      image: "/areas/AreasImages/Rubi_Quispe.webp",
      linkedin: "https://www.linkedin.com/in/rubi-quispe-sierra/"
    }
  ], "reverse": true, "imageSrc": "/areas/AreasThumbnails/dcc-thumbnail.webp", "data-astro-cid-yfkkhka3": true })} ${renderComponent($$result, "AreaCard", $$AreaCard, { "title": "Investigaci\xF3n y Desarrollo", "description": "Transformamos ideas en soluciones reales, desarrollando la tecnolog\xEDa web y herramientas t\xE9cnicas que impulsan la innovaci\xF3n en UNICODE.", "directors": [
    {
      name: "Lenin Castro",
      image: "/areas/AreasImages/Lenin_Castro.webp",
      linkedin: "https://www.linkedin.com/in/lenincastro/"
    },
    {
      name: "Gabriel Chupa",
      image: "/areas/AreasImages/Gabriel_Chupa.webp",
      linkedin: "https://www.linkedin.com/in/gabriel-chupa-ballesteros/"
    }
  ], "imageSrc": "/areas/AreasThumbnails/id-thumbnail.webp", "data-astro-cid-yfkkhka3": true })} </div> </div> </section> <!-- Levantamiento del título y las cards -->  <!-- Fondo dinámico --> ${renderScript($$result, "C:/Users/JEANPIER/Desktop/Unicode/src/components/components-areas/HeroAreas.astro?astro&type=script&index=0&lang.ts")} <!-- más de la mitad de la pantalla es diseño plexus, no espantarse -->`;
}, "C:/Users/JEANPIER/Desktop/Unicode/src/components/components-areas/HeroAreas.astro", void 0);

const $$Areas = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "\xC1reas" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "Navbar", $$Navbar, {})} ${maybeRenderHead()}<main class="w-full"> ${renderComponent($$result2, "HeroAreas", $$HeroAreas, {})} </main> ` })} <!-- MUY LIMPIO -->`;
}, "C:/Users/JEANPIER/Desktop/Unicode/src/pages/areas.astro", void 0);

const $$file = "C:/Users/JEANPIER/Desktop/Unicode/src/pages/areas.astro";
const $$url = "/areas";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    default: $$Areas,
    file: $$file,
    url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
