import { e as createComponent, m as maybeRenderHead, r as renderTemplate, g as addAttribute, l as renderScript, k as renderComponent } from '../chunks/astro/server_C2iRGO63.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_CfJX6JHL.mjs';
import { $ as $$Navbar } from '../chunks/Navbar_CBjdAvp7.mjs';
import 'clsx';
/* empty css                                */
export { renderers } from '../renderers.mjs';

const CONVOCATORIA_ABIERTA = false;

const $$HeroCall = createComponent(($$result, $$props, $$slots) => {
  const areas = [
    { icon: "gth", label: "GTH", href: "/areas/gesti\xF3n-del-talento-humano" },
    { icon: "acd", label: "ACD", href: "/areas/acad\xE9mica" },
    { icon: "rrpp", label: "RRPP", href: "/areas/relaciones-p\xFAblicas" },
    {
      icon: "dcc",
      label: "DCC",
      href: "/areas/direcci\xF3n-de-comunicaci\xF3n-y-contenido"
    },
    { icon: "id", label: "ID", href: "/areas/investigaci\xF3n-y-desarrollo" }
  ];
  return renderTemplate`${maybeRenderHead()}<section class="relative w-full min-h-screen flex items-center justify-center overflow-hidden"> <!-- Imagen de fondo --> <div class="absolute inset-0 z-0"> <img src="/convocatoria-hero.webp" alt="Evento UNICODE" class="w-full h-full object-cover" loading="eager"> <!-- Overlay oscuro con gradiente --> <div class="absolute inset-0 bg-linear-to-b from-black/70 via-black/60 to-[#050505]"></div> </div> <!-- Contenido --> <div class="relative z-10 w-full max-w-2xl mx-auto px-6 text-center flex flex-col items-center"> <!-- Subtítulo --> <p class="text-white text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-[0.25em] uppercase mb-2">
CONVOCATORIA
</p> <!-- Título principal --> ${renderTemplate`<h1 class="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-zinc-500 tracking-tight leading-none mb-8">
CERRADA
</h1>`} <!-- Descripción --> ${renderTemplate`<p class="text-zinc-400 text-sm md:text-base max-w-xl mx-auto mb-12 leading-relaxed">
La convocatoria ha finalizado. ¡Gracias por tu interés! Síguenos en nuestras
        redes sociales para enterarte de la próxima convocatoria.
</p>`} <!-- Íconos de áreas --> <div class="flex items-center justify-center gap-6 sm:gap-10 mb-10"> ${areas.map((area) => renderTemplate`<a${addAttribute(area.href, "href")} class="flex flex-col items-center gap-2 group cursor-pointer"> <div class="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm group-hover:border-unicode/40 group-hover:bg-unicode/10 transition-all duration-300"> ${area.icon === "gth" && renderTemplate`<svg class="w-6 h-6 md:w-7 md:h-7 text-unicode" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"> <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"></path> </svg>`} ${area.icon === "acd" && renderTemplate`<svg class="w-6 h-6 md:w-7 md:h-7 text-unicode" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"> <path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342"></path> </svg>`} ${area.icon === "rrpp" && renderTemplate`<svg class="w-6 h-6 md:w-7 md:h-7 text-unicode" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"> <path stroke-linecap="round" stroke-linejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46"></path> </svg>`} ${area.icon === "dcc" && renderTemplate`<svg class="w-6 h-6 md:w-7 md:h-7 text-unicode" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"> <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"></path> </svg>`} ${area.icon === "id" && renderTemplate`<svg class="w-6 h-6 md:w-7 md:h-7 text-unicode" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"> <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25 M6.75 17.25 1.5 12l5.25-5.25 M14.25 4.5l-4.5 15"></path> </svg>`} </div> <span class="text-white font-bold text-xs md:text-sm tracking-wider group-hover:text-unicode transition-colors duration-300"> ${area.label} </span> </a>`)} </div> <!-- Botón CTA --> ${renderTemplate`<span class="inline-block px-10 py-3.5 bg-zinc-800 text-zinc-500 font-bold rounded-full text-base cursor-not-allowed border border-zinc-700">
Convocatoria cerrada
</span>`} </div> </section>`;
}, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/components/components-call/HeroCall.astro", void 0);

const $$PorQueUnicode = createComponent(($$result, $$props, $$slots) => {
  const beneficios = [
    {
      text: "Aprende desde cero sobre dise\xF1o, branding y marketing digital participando en la creaci\xF3n de campa\xF1as reales para nuestros eventos."
    },
    {
      text: "Fortalece tu perfil profesional trabajando en entornos colaborativos y adquiriendo experiencia pr\xE1ctica en proyectos tecnol\xF3gicos."
    },
    {
      text: "Expande tu red de contactos al conectar con estudiantes y expertos de la industria que comparten tu pasi\xF3n por la innovaci\xF3n."
    },
    {
      text: "Potencia tus habilidades de liderazgo y gesti\xF3n de equipos al formar parte de una organizaci\xF3n din\xE1mica y en constante crecimiento."
    }
  ];
  return renderTemplate`${maybeRenderHead()}<section id="por-que" class="w-full py-16 md:py-24 relative overflow-hidden" data-astro-cid-vqtnfkxd> <div class="max-w-6xl mx-auto px-6" data-astro-cid-vqtnfkxd> <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center" data-astro-cid-vqtnfkxd> <!-- Columna izquierda: Card de beneficios --> <div class="bg-[#050505]/80 border border-unicode rounded-[32px] p-8 md:p-10 shadow-[0_0_30px_rgba(117,211,45,0.1)]" data-astro-cid-vqtnfkxd> <!-- Título --> <h2 class="text-2xl md:text-3xl font-extrabold text-unicode text-center mb-10 tracking-tight text-glow" data-astro-cid-vqtnfkxd>
¿Por qué UNICODE?
</h2> <!-- Grid de beneficios 2x2 --> <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8" data-astro-cid-vqtnfkxd> ${beneficios.map((beneficio) => renderTemplate`<div class="flex items-start gap-4" data-astro-cid-vqtnfkxd>  <div class="shrink-0 mt-1.5 md:mt-1" data-astro-cid-vqtnfkxd> <div class="w-2.5 h-2.5 rounded-full bg-unicode mt-0.5" data-astro-cid-vqtnfkxd></div> </div>  <p class="text-zinc-300 text-xs md:text-[13px] leading-relaxed font-medium" data-astro-cid-vqtnfkxd> ${beneficio.text} </p> </div>`)} </div> </div> <!-- Columna derecha: Mascota --> <div class="flex justify-center lg:justify-end" data-astro-cid-vqtnfkxd> <div class="relative" data-astro-cid-vqtnfkxd> <!-- Glow detrás de la mascota --> <div class="absolute inset-0 bg-unicode/15 rounded-full blur-[90px] scale-75 pointer-events-none" data-astro-cid-vqtnfkxd></div> <img src="/mascota/mascota-convocatoria-hd-final.png" alt="Mascota UNICODE" class="relative z-10 w-72 sm:w-80 md:w-96 lg:w-[450px] h-auto object-contain drop-shadow-[0_0_30px_rgba(117,211,45,0.25)] animate-float" loading="lazy" style="animation: float 6s ease-in-out infinite;" data-astro-cid-vqtnfkxd> </div> </div> </div> </div>  </section>`;
}, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/components/components-call/PorQueUnicode.astro", void 0);

const $$RegistroModal = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${CONVOCATORIA_ABIERTA}${renderScript($$result, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/components/components-call/RegistroModal.astro?astro&type=script&index=0&lang.ts")}`;
}, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/components/components-call/RegistroModal.astro", void 0);

const $$Call = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Convocatoria" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "Navbar", $$Navbar, {})} ${renderComponent($$result2, "HeroCall", $$HeroCall, {})} ${maybeRenderHead()}<main class="w-full"> <div class="w-full h-px bg-linear-to-r from-transparent via-zinc-800 to-transparent"></div> ${renderComponent($$result2, "PorQueUnicode", $$PorQueUnicode, {})} ${renderComponent($$result2, "RegistroModal", $$RegistroModal, {})} </main> ` })}`;
}, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/pages/call.astro", void 0);

const $$file = "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/pages/call.astro";
const $$url = "/call";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Call,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
