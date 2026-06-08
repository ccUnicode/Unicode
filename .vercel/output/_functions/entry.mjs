import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_C0S0N7aJ.mjs';
import { manifest } from './manifest_i8BUETu0.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/404.astro.mjs');
const _page2 = () => import('./pages/admin.astro.mjs');
const _page3 = () => import('./pages/api/admin-login.astro.mjs');
const _page4 = () => import('./pages/api/admin-logout.astro.mjs');
const _page5 = () => import('./pages/api/admin-postulantes.astro.mjs');
const _page6 = () => import('./pages/api/postular.astro.mjs');
const _page7 = () => import('./pages/areas/académica.astro.mjs');
const _page8 = () => import('./pages/areas/dirección-de-comunicación-y-contenido.astro.mjs');
const _page9 = () => import('./pages/areas/gestión-del-talento-humano.astro.mjs');
const _page10 = () => import('./pages/areas/investigación-y-desarrollo.astro.mjs');
const _page11 = () => import('./pages/areas/relaciones-públicas.astro.mjs');
const _page12 = () => import('./pages/areas.astro.mjs');
const _page13 = () => import('./pages/call.astro.mjs');
const _page14 = () => import('./pages/eventos.astro.mjs');
const _page15 = () => import('./pages/projects.astro.mjs');
const _page16 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/404.astro", _page1],
    ["src/pages/admin.astro", _page2],
    ["src/pages/api/admin-login.ts", _page3],
    ["src/pages/api/admin-logout.ts", _page4],
    ["src/pages/api/admin-postulantes.ts", _page5],
    ["src/pages/api/postular.ts", _page6],
    ["src/pages/areas/académica.astro", _page7],
    ["src/pages/areas/dirección-de-comunicación-y-contenido.astro", _page8],
    ["src/pages/areas/gestión-del-talento-humano.astro", _page9],
    ["src/pages/areas/investigación-y-desarrollo.astro", _page10],
    ["src/pages/areas/relaciones-públicas.astro", _page11],
    ["src/pages/areas.astro", _page12],
    ["src/pages/call.astro", _page13],
    ["src/pages/eventos.astro", _page14],
    ["src/pages/projects.astro", _page15],
    ["src/pages/index.astro", _page16]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./noop-entrypoint.mjs'),
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "d73e8a8e-d755-4609-873e-917230dcf702",
    "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) ;

export { __astrojsSsrVirtualEntry as default, pageMap };
