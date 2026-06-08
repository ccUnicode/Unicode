import { e as createComponent, m as maybeRenderHead, r as renderTemplate, g as addAttribute, k as renderComponent, l as renderScript, h as createAstro } from '../chunks/astro/server_C2iRGO63.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_CfJX6JHL.mjs';
import { $ as $$Navbar } from '../chunks/Navbar_CBjdAvp7.mjs';
import 'clsx';
/* empty css                                    */
import { $ as $$ProjectCard, a as $$ProjectModal } from '../chunks/ProjectModal_WDxBY2vZ.mjs';
import { p as projects, f as featuredProjects } from '../chunks/projects_llmFszin.mjs';
export { renderers } from '../renderers.mjs';

const $$ProjectFilters = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<div class="flex flex-col md:flex-row gap-4 items-center justify-center mb-10 w-full max-w-4xl z-10 relative" data-astro-cid-hsslfqyo> <div class="relative w-full max-w-xl group" data-astro-cid-hsslfqyo> <span class="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-unicode transition-colors" data-astro-cid-hsslfqyo> <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-hsslfqyo><circle cx="11" cy="11" r="8" data-astro-cid-hsslfqyo></circle><path d="m21 21-4.3-4.3" data-astro-cid-hsslfqyo></path></svg> </span> <input type="text" id="project-search" placeholder="Buscar proyectos ..." class="w-full bg-zinc-900/50 border border-zinc-800 rounded-full py-3 px-12 focus:outline-none focus:border-unicode transition-all placeholder:text-zinc-600 focus:ring-1 focus:ring-unicode/20 text-white" data-astro-cid-hsslfqyo> </div> <div class="relative" data-astro-cid-hsslfqyo> <select id="project-area-filter" class="appearance-none w-full md:w-auto bg-zinc-900/50 border border-zinc-800 rounded-full pl-6 pr-12 py-3 focus:outline-none focus:border-unicode transition-colors text-zinc-300 hover:border-unicode cursor-pointer text-sm font-medium" data-astro-cid-hsslfqyo> <option value="" data-astro-cid-hsslfqyo>Todas las Áreas</option> <option value="dcc" data-astro-cid-hsslfqyo>DCC</option> <option value="acd" data-astro-cid-hsslfqyo>ACD</option> <option value="gth" data-astro-cid-hsslfqyo>GTH</option> <option value="rrpp" data-astro-cid-hsslfqyo>RRPP</option> <option value="id" data-astro-cid-hsslfqyo>ID</option> </select> <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500" data-astro-cid-hsslfqyo> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-hsslfqyo><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" data-astro-cid-hsslfqyo></polygon></svg> </div> </div> </div> `;
}, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/components/components-projects/ProjectFilters.astro", void 0);

const $$Astro$3 = createAstro();
const $$ProjectGrid = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$ProjectGrid;
  const { projects } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<div class="relative group/main-carousel w-full" data-astro-cid-daiifg4b> <!-- Container --> <div id="projects-grid" class="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 overflow-x-auto md:overflow-hidden pb-4 md:pb-0 scroll-smooth snap-x snap-mandatory scrollbar-hide" data-astro-cid-daiifg4b> ${projects.map((project) => renderTemplate`<div class="project-item flex-none w-[88vw] md:w-auto h-full snap-center"${addAttribute(project.area, "data-area")} data-astro-cid-daiifg4b> ${renderComponent($$result, "ProjectCard", $$ProjectCard, { "project": project, "data-astro-cid-daiifg4b": true })} </div>`)} </div> <!-- Carousel arrows & dots (Mobile Only) --> <div class="flex md:hidden items-center justify-center gap-6 mt-8" data-astro-cid-daiifg4b> <button id="prev-main" class="w-12 h-12 flex items-center justify-center bg-zinc-900 border border-zinc-800 text-unicode rounded-full active:scale-95 active:border-unicode active:shadow-unicode transition-all shadow-lg hover:border-unicode/50 cursor-pointer" aria-label="Anterior" data-astro-cid-daiifg4b> <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" data-astro-cid-daiifg4b> <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" data-astro-cid-daiifg4b></path> </svg> </button> <div id="main-carousel-indicator" class="flex justify-center gap-3" data-astro-cid-daiifg4b> <!-- Dots will be injected by JS based on visible filtered items --> </div> <button id="next-main" class="w-12 h-12 flex items-center justify-center bg-zinc-900 border border-zinc-800 text-unicode rounded-full active:scale-95 active:border-unicode active:shadow-unicode transition-all shadow-lg hover:border-unicode/50 cursor-pointer" aria-label="Siguiente" data-astro-cid-daiifg4b> <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" data-astro-cid-daiifg4b> <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" data-astro-cid-daiifg4b></path> </svg> </button> </div> </div> ${renderScript($$result, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/components/components-projects/ProjectGrid.astro?astro&type=script&index=0&lang.ts")} `;
}, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/components/components-projects/ProjectGrid.astro", void 0);

const $$ProjectHero = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<section class="max-w-7xl mx-auto px-6 text-center mb-16 animate-fade-in"> <h1 class="text-5xl md:text-7xl font-bold text-unicode tracking-tighter mb-6 drop-shadow-[0_0_15px_rgba(117,211,45,0.3)]">
PROYECTOS
</h1> <p class="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto italic mt-4">
Impulsando el desarrollo de sistemas tech para la formación educativa de
    nuestros estudiantes
</p> </section>`;
}, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/components/components-projects/ProjectHero.astro", void 0);

const $$Astro$2 = createAstro();
const $$FeaturedProjectCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$FeaturedProjectCard;
  const { project = {} } = Astro2.props;
  const { title = "Proyecto", category = "PROYECTO", image, imagePosition = "center" } = project;
  return renderTemplate`${maybeRenderHead()}<div class="shrink-0 w-[80vw] md:w-[45vw] lg:w-[35vw] aspect-video bg-zinc-900/80 rounded-[2.5rem] border-2 border-zinc-800 hover:border-unicode shadow-2xl hover:shadow-unicode-sm relative overflow-hidden transition-all duration-500 group snap-center project-card-featured"> <div${addAttribute(`absolute inset-0 bg-cover bg-${imagePosition} grayscale-50 opacity-40 group-hover:opacity-60 group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110`, "class")}${addAttribute(image ? `background-image: url('${image}')` : "background-image: url('/placeholder-projects.webp')", "style")}></div> <div class="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent p-8 md:p-12 flex flex-col justify-end"> <div class="flex gap-2 mb-3 md:mb-4"> <span class="px-3 py-1 bg-unicode/20 border border-unicode/30 rounded-full text-[10px] text-unicode uppercase font-bold tracking-widest backdrop-blur-md"> ${category} </span> </div> <div class="flex flex-col md:flex-row md:items-end justify-between gap-4"> <h3 class="text-xl md:text-3xl font-bold group-hover:text-unicode transition-colors leading-tight"> ${title} </h3> <button class="js-open-project-modal cursor-pointer inline-flex items-center justify-center px-6 py-2.5 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-sm font-bold text-white hover:border-unicode hover:text-unicode hover:bg-unicode/10 transition-all duration-300 w-fit shrink-0"${addAttribute(JSON.stringify(project), "data-project")}>
Ver detalles
</button> </div> </div> </div>`;
}, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/components/components-projects/FeaturedProjectCard.astro", void 0);

const $$Astro$1 = createAstro();
const $$ProjectSlider = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$ProjectSlider;
  const { projects } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<div class="relative w-full overflow-hidden group" data-astro-cid-6jaqoai5> <!-- Navigation Buttons Hint --> <div class="absolute left-0 top-0 bottom-0 w-24 bg-linear-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" data-astro-cid-6jaqoai5></div> <div class="absolute right-0 top-0 bottom-0 w-24 bg-linear-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" data-astro-cid-6jaqoai5></div> <!-- Slider Container --> <div id="project-slider" class="flex gap-12 overflow-x-auto pb-12 snap-x snap-mandatory scroll-smooth scrollbar-hide px-6 md:px-[15vw] cursor-grab active:cursor-grabbing" data-astro-cid-6jaqoai5> ${projects.map((project) => renderTemplate`${renderComponent($$result, "FeaturedProjectCard", $$FeaturedProjectCard, { "project": project, "data-astro-cid-6jaqoai5": true })}`)} </div> <!-- Custom Scrollbar/Indicator and Controls --> <div class="flex items-center justify-center gap-6 mt-8" data-astro-cid-6jaqoai5> <button id="prev-project" class="w-12 h-12 flex items-center justify-center bg-zinc-900 border border-zinc-800 text-unicode rounded-full active:scale-95 active:border-unicode active:shadow-unicode transition-all shadow-lg hover:border-unicode/50 cursor-pointer" aria-label="Anterior" data-astro-cid-6jaqoai5> <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" data-astro-cid-6jaqoai5> <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" data-astro-cid-6jaqoai5></path> </svg> </button> <div class="flex justify-center gap-3" data-astro-cid-6jaqoai5> ${projects.map((_, i) => renderTemplate`<button class="slider-dot w-2 h-2 rounded-full bg-zinc-800 transition-all duration-300 cursor-pointer"${addAttribute(i, "data-index")}${addAttribute(`Ir al proyecto ${i + 1}`, "aria-label")} data-astro-cid-6jaqoai5></button>`)} </div> <button id="next-project" class="w-12 h-12 flex items-center justify-center bg-zinc-900 border border-zinc-800 text-unicode rounded-full active:scale-95 active:border-unicode active:shadow-unicode transition-all shadow-lg hover:border-unicode/50 cursor-pointer" aria-label="Siguiente" data-astro-cid-6jaqoai5> <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" data-astro-cid-6jaqoai5> <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" data-astro-cid-6jaqoai5></path> </svg> </button> </div> </div>  ${renderScript($$result, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/components/components-projects/ProjectSlider.astro?astro&type=script&index=0&lang.ts")}`;
}, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/components/components-projects/ProjectSlider.astro", void 0);

const $$Astro = createAstro();
const $$FeaturedSection = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$FeaturedSection;
  const { projects } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<section id="featured-section" class="w-full mb-32 animate-fade-in" style="animation-delay: 200ms;"> <div class="max-w-7xl mx-auto px-6 mb-8 flex justify-center"> <h2 class="text-2xl font-bold flex items-center gap-3 text-center"> <span class="w-8 h-[2px] bg-unicode"></span>
PROYECTOS DESTACADOS
<span class="w-8 h-[2px] bg-unicode"></span> </h2> </div> ${renderComponent($$result, "ProjectSlider", $$ProjectSlider, { "projects": projects })} </section>`;
}, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/components/components-projects/FeaturedSection.astro", void 0);

const $$Projects = createComponent(($$result, $$props, $$slots) => {
  const activeProjects = projects.filter((p) => p.status === "Activo");
  const activeFeatured = featuredProjects.filter((p) => p.status === "Activo");
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Proyectos" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "Navbar", $$Navbar, {})} ${maybeRenderHead()}<main class="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-20 overflow-x-hidden"> ${renderComponent($$result2, "ProjectHero", $$ProjectHero, {})} ${activeFeatured.length > 0 && renderTemplate`${renderComponent($$result2, "FeaturedSection", $$FeaturedSection, { "projects": activeFeatured })}`} <section class="max-w-7xl mx-auto px-6 relative z-10"> <h2 class="text-4xl font-bold mb-8 text-center">
Lista de <span class="text-unicode">proyectos</span> </h2> <div class="flex justify-center mb-6"> ${renderComponent($$result2, "ProjectFilters", $$ProjectFilters, {})} </div> <div id="no-results" class="hidden text-center py-20 animate-fade-in"> <p class="text-zinc-500 text-xl font-medium">
No se encontraron proyectos que coincidan con tu búsqueda.
</p> <button id="clear-search" class="mt-4 text-unicode hover:underline text-sm">Limpiar búsqueda</button> </div> ${renderComponent($$result2, "ProjectGrid", $$ProjectGrid, { "projects": activeProjects })} <!-- Pagination Controls --> <div id="pagination-controls" class="flex items-center justify-center gap-6 mt-12" style="display: none;"> <button id="prev-page" type="button" class="w-12 h-12 flex items-center justify-center bg-zinc-900 border border-zinc-800 text-unicode rounded-full active:scale-95 transition-all shadow-lg hover:border-unicode/50 cursor-pointer disabled:opacity-50" aria-label="Anterior"> <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"> <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path> </svg> </button> <div id="page-numbers" class="flex justify-center gap-3"> <!-- Page dots will be injected here by JS --> </div> <button id="next-page" type="button" class="w-12 h-12 flex items-center justify-center bg-zinc-900 border border-zinc-800 text-unicode rounded-full active:scale-95 transition-all shadow-lg hover:border-unicode/50 cursor-pointer disabled:opacity-50" aria-label="Siguiente"> <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"> <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path> </svg> </button> </div> </section> </main> ${renderComponent($$result2, "ProjectModal", $$ProjectModal, {})} ${renderScript($$result2, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/pages/projects.astro?astro&type=script&index=0&lang.ts")} ` })}`;
}, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/pages/projects.astro", void 0);

const $$file = "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/pages/projects.astro";
const $$url = "/projects";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Projects,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
