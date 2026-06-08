import { e as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_C2iRGO63.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_CsKb6_WZ.mjs';
import { $ as $$Navbar } from '../chunks/Navbar_Bwy2egbE.mjs';
export { renderers } from '../renderers.mjs';

const $$404 = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "P\xE1gina no encontrada", "description": "La p\xE1gina que buscas no existe o fue movida." }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "Navbar", $$Navbar, {})} ${maybeRenderHead()}<main class="flex-1 flex items-center justify-center px-6 py-32"> <div class="text-center max-w-lg"> <!-- Código 404 --> <h1 class="text-[8rem] sm:text-[10rem] font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-unicode to-unicode/20 select-none">
404
</h1> <!-- Mensaje principal --> <h2 class="text-2xl sm:text-3xl font-bold text-white mt-2 mb-4">
Página no encontrada
</h2> <p class="text-zinc-400 text-base sm:text-lg mb-10 leading-relaxed">
La ruta que buscas no existe o fue eliminada. 
                Pero no te preocupes, puedes volver a explorar Unicode.
</p> <!-- Botones --> <div class="flex flex-col sm:flex-row gap-4 justify-center"> <a href="/" class="bg-unicode text-black font-bold px-8 py-3 rounded-full hover:bg-unicode-light transition-all shadow-unicode hover:shadow-unicode-lg text-sm sm:text-base">
Ir al inicio
</a> <a href="/areas" class="border border-unicode/40 text-unicode font-bold px-8 py-3 rounded-full hover:bg-unicode hover:text-black transition-all text-sm sm:text-base">
Ver áreas
</a> </div> </div> </main> ` })}`;
}, "C:/Users/JEANPIER/Desktop/Unicode/src/pages/404.astro", void 0);

const $$file = "C:/Users/JEANPIER/Desktop/Unicode/src/pages/404.astro";
const $$url = "/404";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    default: $$404,
    file: $$file,
    url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
