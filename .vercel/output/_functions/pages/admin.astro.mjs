import { e as createComponent, k as renderComponent, l as renderScript, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_C2iRGO63.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_CfJX6JHL.mjs';
/* empty css                                 */
export { renderers } from '../renderers.mjs';

const $$Admin = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Admin", "data-astro-cid-2zp6q64z": true }, { "default": async ($$result2) => renderTemplate`  ${maybeRenderHead()}<div id="login-screen" class="min-h-screen flex items-center justify-center px-4" data-astro-cid-2zp6q64z> <div class="w-full max-w-sm bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8" data-astro-cid-2zp6q64z> <h2 class="text-white text-xl font-bold text-center mb-6" data-astro-cid-2zp6q64z>Acceso</h2> <form id="login-form" class="space-y-4" data-astro-cid-2zp6q64z> <div data-astro-cid-2zp6q64z> <input type="password" id="admin-password" name="password" placeholder="Contraseña" required autocomplete="current-password" class="w-full bg-zinc-950 border border-zinc-700 focus:border-unicode focus:ring-1 focus:ring-unicode rounded-lg px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-zinc-600" data-astro-cid-2zp6q64z> </div> <!-- Error message --> <div id="login-error" class="hidden text-red-400 text-xs text-center font-medium py-2 bg-red-500/10 rounded-lg border border-red-500/20" data-astro-cid-2zp6q64z></div> <button type="submit" id="login-btn" class="w-full bg-unicode hover:bg-unicode-light text-black font-bold text-sm py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer" data-astro-cid-2zp6q64z> <span id="login-btn-text" data-astro-cid-2zp6q64z>Ingresar</span> <svg id="login-spinner" class="w-4 h-4 animate-spin hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" data-astro-cid-2zp6q64z> <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" data-astro-cid-2zp6q64z></circle> <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" data-astro-cid-2zp6q64z></path> </svg> </button> </form> </div> </div>  <div id="dashboard-screen" class="hidden min-h-screen" data-astro-cid-2zp6q64z> <!-- Top bar --> <header class="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-md border-b border-zinc-800/50" data-astro-cid-2zp6q64z> <div class="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 sm:h-16" data-astro-cid-2zp6q64z> <div class="flex items-center gap-2 sm:gap-3" data-astro-cid-2zp6q64z> <img src="/logos/logo-unicode-blanco.webp" alt="Unicode" class="w-7 h-7 sm:w-8 sm:h-8 opacity-80" data-astro-cid-2zp6q64z> <h1 class="text-white font-bold text-sm sm:text-lg" data-astro-cid-2zp6q64z>
Admin Dashboard
</h1> </div> <button id="logout-btn" class="text-red-400 hover:text-red-300 text-xs sm:text-sm font-medium transition-colors cursor-pointer" data-astro-cid-2zp6q64z>
Cerrar Sesión
</button> </div> </header> <main class="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8" data-astro-cid-2zp6q64z> <!-- Tabs de áreas --> <div class="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6" data-astro-cid-2zp6q64z> <button class="area-tab active-tab px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200" data-area="GTH" data-astro-cid-2zp6q64z>
Área de GTH
</button> <button class="area-tab px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200" data-area="ACD" data-astro-cid-2zp6q64z>
Área Académica
</button> <button class="area-tab px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200" data-area="ID" data-astro-cid-2zp6q64z>
Área de ID
</button> <button class="area-tab px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200" data-area="RRPP" data-astro-cid-2zp6q64z>
Área RRPP
</button> <button class="area-tab px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200" data-area="DCC" data-astro-cid-2zp6q64z>
Área DCC
</button> </div> <!-- Info bar + Controls --> <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6" data-astro-cid-2zp6q64z> <p id="results-info" class="text-zinc-400 text-xs sm:text-sm" data-astro-cid-2zp6q64z>
Mostrando <span id="count" class="text-unicode font-bold" data-astro-cid-2zp6q64z>0</span> postulantes
          para <strong id="area-label" class="text-white" data-astro-cid-2zp6q64z>Área de GTH</strong> </p> <div class="flex flex-wrap items-center gap-2 sm:gap-3" data-astro-cid-2zp6q64z> <!-- Export Excel --> <button id="export-btn" class="flex items-center gap-1.5 bg-unicode hover:bg-unicode-light text-black font-bold text-xs px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all cursor-pointer" data-astro-cid-2zp6q64z> <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" data-astro-cid-2zp6q64z> <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" data-astro-cid-2zp6q64z></path> </svg>
Exportar Excel
</button> <!-- Filtro opción --> <select id="filter-opcion" class="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 outline-none focus:border-unicode cursor-pointer appearance-none admin-select" data-astro-cid-2zp6q64z> <option value="todas" data-astro-cid-2zp6q64z>Todas las opciones</option> <option value="1ra" data-astro-cid-2zp6q64z>Solo 1ra opción</option> <option value="2da" data-astro-cid-2zp6q64z>Solo 2da opción</option> </select> <!-- Ordenamiento --> <select id="filter-orden" class="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 outline-none focus:border-unicode cursor-pointer appearance-none admin-select" data-astro-cid-2zp6q64z> <option value="reciente" data-astro-cid-2zp6q64z>Más recientes</option> <option value="1ra-2da" data-astro-cid-2zp6q64z>Prioridad (1ra → 2da)</option> </select> </div> </div> <!-- Loading --> <div id="loading-indicator" class="flex items-center justify-center py-20" data-astro-cid-2zp6q64z> <div class="flex flex-col items-center gap-3" data-astro-cid-2zp6q64z> <svg class="w-8 h-8 animate-spin text-unicode" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" data-astro-cid-2zp6q64z> <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" data-astro-cid-2zp6q64z></circle> <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" data-astro-cid-2zp6q64z></path> </svg> <p class="text-zinc-500 text-sm" data-astro-cid-2zp6q64z>Cargando postulantes...</p> </div> </div> <!-- Empty state --> <div id="empty-state" class="hidden text-center py-20" data-astro-cid-2zp6q64z> <p class="text-zinc-500 text-base" data-astro-cid-2zp6q64z>
No hay postulantes para esta área.
</p> </div> <!-- Error state --> <div id="error-state" class="hidden text-center py-20" data-astro-cid-2zp6q64z> <p class="text-red-400 text-base" id="error-message" data-astro-cid-2zp6q64z>
Error al cargar los datos.
</p> <button id="retry-btn" class="mt-4 text-unicode text-sm underline hover:text-unicode-light cursor-pointer" data-astro-cid-2zp6q64z>
Reintentar
</button> </div> <!-- Postulantes list --> <div id="postulantes-list" class="hidden space-y-3 sm:space-y-4" data-astro-cid-2zp6q64z></div> </main> </div> ` })}  ${renderScript($$result, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/pages/admin.astro?astro&type=script&index=0&lang.ts")}`;
}, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/pages/admin.astro", void 0);

const $$file = "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/pages/admin.astro";
const $$url = "/admin";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Admin,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
