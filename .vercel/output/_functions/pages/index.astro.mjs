import { e as createComponent, r as renderTemplate, m as maybeRenderHead, g as addAttribute, h as createAstro, k as renderComponent } from '../chunks/astro/server_C2iRGO63.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_CfJX6JHL.mjs';
import { $ as $$Navbar } from '../chunks/Navbar_CBjdAvp7.mjs';
import 'clsx';
/* empty css                                 */
import { e as eventosRealizados } from '../chunks/events_B7Q_j2Om.mjs';
import { p as projects } from '../chunks/projects_llmFszin.mjs';
export { renderers } from '../renderers.mjs';

var __freeze$1 = Object.freeze;
var __defProp$1 = Object.defineProperty;
var __template$1 = (cooked, raw) => __freeze$1(__defProp$1(cooked, "raw", { value: __freeze$1(cooked.slice()) }));
var _a$1;
const $$Hero = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate(_a$1 || (_a$1 = __template$1(["", `<section class="min-h-[calc(100vh-80px)] pt-20 pb-12 md:pt-24 flex items-center relative overflow-hidden" data-astro-cid-bbe6dxrz> <div class="max-w-7xl mx-auto px-6 sm:px-8 lg:px-8 w-full relative z-10" data-astro-cid-bbe6dxrz> <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center" data-astro-cid-bbe6dxrz> <!-- Left Column: Content --> <div class="flex flex-col text-center lg:text-left justify-center mt-8 lg:mt-0 px-2 sm:px-0 lg:pl-18" data-astro-cid-bbe6dxrz> <!-- Logo Text inline with SVG --> <div class="flex flex-wrap items-center justify-center lg:justify-start gap-3 md:gap-4 mb-4 md:mb-6" data-astro-cid-bbe6dxrz> <img src="/logos/logo-unicode.webp" alt="Unicode Logo" class="w-10 h-10 md:w-14 md:h-14 lg:w-16 lg:h-16 object-contain drop-shadow-[0_0_15px_rgba(117,211,45,0.4)] shrink-0" data-astro-cid-bbe6dxrz> <span class="text-4xl sm:text-5xl md:text-6xl lg:text-[4rem] font-semibold text-unicode tracking-tight text-glow uppercase leading-none" style="font-family: 'Poppins', sans-serif;" data-astro-cid-bbe6dxrz>
UNICODE
</span> </div> <h1 class="text-3xl sm:text-4xl md:text-[2.5rem] lg:text-[2.75rem] font-semibold text-white mb-5 md:mb-6 tracking-tight leading-[1.2]" data-astro-cid-bbe6dxrz>
Conectando prop\xF3sitos, <br data-astro-cid-bbe6dxrz>
creando oportunidades.
</h1> <p class="text-zinc-300 text-sm sm:text-base md:text-lg lg:text-xl max-w-2xl mx-auto lg:mx-0 mb-8 leading-relaxed font-normal" data-astro-cid-bbe6dxrz>
Velando por el bienestar estudiantil, la informaci\xF3n, educaci\xF3n y
          conocimiento de nuestra comunidad universitaria.
</p> <!-- CTAs --> <div class="flex flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 w-full max-w-md mx-auto lg:mx-0 sm:max-w-none" data-astro-cid-bbe6dxrz> <a href="#nosotros" class="hero-scroll-link flex-1 sm:flex-none px-7 py-3 md:px-9 md:py-3.5 bg-unicode hover:bg-unicode-light text-[#050505] font-bold rounded-full transition-all duration-300 text-base md:text-lg shadow-unicode hover:shadow-unicode-lg text-center hover:scale-105 active:scale-95" data-astro-cid-bbe6dxrz>
Con\xF3cenos
</a> <a href="#novedades" class="hero-scroll-link flex-1 sm:flex-none px-7 py-3 md:px-9 md:py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-full border border-zinc-800 transition-all duration-300 text-base md:text-lg text-center hover:scale-105 active:scale-95" data-astro-cid-bbe6dxrz>
Novedades
</a> </div> </div> <!-- Right Column: Image --> <div class="relative w-full h-[280px] sm:h-[420px] lg:h-[550px] flex justify-center items-center mt-10 sm:mt-0 pb-4 sm:pb-0" data-astro-cid-bbe6dxrz> <!-- Contenedor de escala (evita conflicto con la animaci\xF3n float) --> <div class="w-full h-full transform scale-[1.35] translate-y-8 sm:translate-y-0 sm:scale-100 flex justify-center items-center origin-center" data-astro-cid-bbe6dxrz> <img src="/mascota/Mascota-Unicode-Landing-Hero-HD-clean.png" alt="Mascota Unicode" class="w-full h-full object-contain filter drop-shadow-[0_0_40px_rgba(117,211,45,0.15)] animate-float" style="animation: float 6s ease-in-out infinite;" data-astro-cid-bbe6dxrz> </div> <!-- Glow effect behind mascot --> <div class="absolute inset-0 bg-unicode/5 blur-[120px] rounded-full z-[-1] transform scale-75 hidden lg:block" data-astro-cid-bbe6dxrz></div> </div> </div> </div> <script>
    document.addEventListener("DOMContentLoaded", () => {
      const links = document.querySelectorAll(".hero-scroll-link");

      links.forEach((link) => {
        link.addEventListener("click", function (e) {
          e.preventDefault();
          const href = this.getAttribute("href");
          if (!href || !href.startsWith("#")) return;

          const targetId = href.substring(1);
          const targetElement = document.getElementById(targetId);

          if (targetElement) {
            let offsetHeight = 80;
            if (targetId === "nosotros") {
              // Restauramos el offset a 80 para que el t\xEDtulo "NOSOTROS" sea visible
              offsetHeight = 80;
            } else if (targetId === "novedades") {
              offsetHeight = 80;
            }

            const targetPosition =
              targetElement.getBoundingClientRect().top +
              window.scrollY -
              offsetHeight;

            const startPosition = window.scrollY;
            const distance = targetPosition - startPosition;
            const duration = 800;
            let start = null;

            window.requestAnimationFrame(function step(timestamp) {
              if (!start) start = timestamp;
              const progress = timestamp - start;

              const easeInOutCubic =
                progress / duration < 0.5
                  ? 4 * Math.pow(progress / duration, 3)
                  : 1 - Math.pow((-2 * progress) / duration + 2, 3) / 2;

              const currentPosition = startPosition + distance * easeInOutCubic;
              window.scrollTo(0, currentPosition);

              if (progress < duration) {
                window.requestAnimationFrame(step);
              } else {
                window.scrollTo(0, targetPosition);
              }
            });
          }
        });
      });
    });
  <\/script>  </section>`])), maybeRenderHead());
}, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/components/Hero.astro", void 0);

const $$Stats = createComponent(($$result, $$props, $$slots) => {
  const stats = [
    {
      icon: "members",
      value: "+70",
      label: "Miembros Activos"
    },
    {
      icon: "projects",
      value: "3",
      label: "Proyectos Completados"
    },
    {
      icon: "events",
      value: "4",
      label: "Eventos Realizados"
    },
    {
      icon: "years",
      value: "1",
      label: "A\xF1o de Trayectoria"
    }
  ];
  return renderTemplate`${maybeRenderHead()}<section id="stats" class="w-full py-20 md:py-28 relative"> <!-- Glow decorativo superior --> <div class="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-unicode/5 rounded-full blur-[100px] pointer-events-none"></div> <div class="max-w-6xl mx-auto px-6 relative z-10"> <!-- Título --> <div class="text-center mb-14"> <h2 class="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight"> <span class="text-unicode text-glow">CIFRAS</span> QUE NOS DEFINEN
</h2> <div class="w-20 h-1 bg-unicode rounded-full mx-auto mt-5 opacity-60"></div> </div> <!-- Grid de tarjetas --> <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"> ${stats.map((stat) => renderTemplate`<div class="group relative bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 sm:p-8 text-center transition-all duration-500 hover:border-unicode/40 hover:bg-zinc-900/90 hover:-translate-y-1 hover:shadow-unicode">  <div class="absolute inset-0 rounded-2xl bg-unicode/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>  <div class="flex items-center justify-center mb-5"> <div class="w-14 h-14 rounded-xl bg-unicode/10 border border-unicode/20 flex items-center justify-center group-hover:bg-unicode/15 transition-colors duration-300"> ${stat.icon === "members" && renderTemplate`<svg class="w-7 h-7 text-unicode" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"> <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"></path> </svg>`} ${stat.icon === "projects" && renderTemplate`<svg class="w-7 h-7 text-unicode" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"> <path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"></path> </svg>`} ${stat.icon === "events" && renderTemplate`<svg class="w-7 h-7 text-unicode" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"> <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"></path> </svg>`} ${stat.icon === "years" && renderTemplate`<svg class="w-7 h-7 text-unicode" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"> <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.016 6.016 0 01-4.27 1.772 6.016 6.016 0 01-4.27-1.772"></path> </svg>`} </div> </div>  <p class="text-3xl md:text-4xl font-bold text-unicode mb-2 tracking-tight"> ${stat.value} </p>  <p class="text-sm md:text-base font-semibold text-gray-300 tracking-wide"> ${stat.label} </p> </div>`)} </div> </div> </section>`;
}, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/components/components-home/Stats.astro", void 0);

const $$Astro$1 = createAstro();
const $$NovedadCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$NovedadCard;
  const { image, title, description, href = "#" } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<div class="group bg-[#111111]/80 border border-zinc-800 rounded-[2.5rem] p-5 transition-all duration-300 hover:border-unicode/30 hover:bg-[#151515] flex flex-col h-full"> <!-- Imagen --> <div class="relative w-full aspect-4/3 rounded-4xl overflow-hidden mb-6 bg-zinc-900"> <img${addAttribute(image, "src")}${addAttribute(title, "alt")} class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy"> </div> <!-- Contenido --> <div class="flex flex-col grow px-2"> <h3 class="text-white font-bold text-xl leading-snug mb-3 group-hover:text-unicode transition-colors duration-300"> ${title} </h3> <p class="text-zinc-500 text-xs leading-relaxed mb-8 grow"> ${description} </p> <!-- Botón --> <div class="mt-auto"> <a${addAttribute(href, "href")} target="_blank" rel="noopener noreferrer" class="inline-block px-10 py-2.5 border border-unicode/40 text-unicode font-bold text-xs rounded-full hover:bg-unicode hover:text-black transition-all duration-300">
Ver detalles
</a> </div> </div> </div>`;
}, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/components/components-home/NovedadCard.astro", void 0);

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$Astro = createAstro();
const $$Novedades = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Novedades;
  const projectNews = projects.filter((p) => p.status === "Activo").map((p) => ({
    title: p.title,
    description: p.description,
    image: p.image,
    href: p.link && p.link !== "https://unicode.vercel.app" ? p.link : `/proyectos`
  }));
  const eventNews = eventosRealizados.map((e) => ({
    title: e.titulo,
    description: e.descripcion,
    image: e.imagen,
    href: e.link ?? "/eventos"
  }));
  const combined = [];
  const maxLen = Math.max(projectNews.length, eventNews.length);
  for (let i = 0; i < maxLen && combined.length < 5; i++) {
    if (i < eventNews.length) combined.push(eventNews[i]);
    if (combined.length < 5 && i < projectNews.length) combined.push(projectNews[i]);
  }
  const novedades = combined.slice(0, 5);
  return renderTemplate(_a || (_a = __template(["", '<section id="novedades" class="w-full py-16 md:py-24 relative" data-astro-cid-7gqybywi> <div class="max-w-6xl mx-auto px-6" data-astro-cid-7gqybywi> <!-- T\xEDtulo principal --> <div class="text-center mb-16" data-astro-cid-7gqybywi> <h2 class="text-4xl md:text-6xl font-bold text-unicode text-glow tracking-wider uppercase" data-astro-cid-7gqybywi>\nNOVEDADES\n</h2> </div> <!-- Carrusel de tarjetas --> <div class="relative group/news-carousel w-full overflow-hidden" data-astro-cid-7gqybywi> <!-- "track" envuelve las tarjetas y servir\xE1 para moverlas con translate --> <div id="novedades-track" class="flex gap-6 lg:gap-8 pb-4 md:pb-0 transition-transform duration-700 ease-in-out cursor-grab active:cursor-grabbing w-full" data-astro-cid-7gqybywi> ', ' </div> <!-- Arrow Controls & Indicator (All views) --> <div class="flex items-center justify-center gap-6 mt-10" data-astro-cid-7gqybywi> <button id="prev-news" class="w-12 h-12 flex items-center justify-center bg-zinc-900 border border-zinc-800 text-unicode rounded-full active:scale-95 transition-all shadow-lg hover:border-unicode/50" aria-label="Anterior" data-astro-cid-7gqybywi> <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" data-astro-cid-7gqybywi> <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" data-astro-cid-7gqybywi></path> </svg> </button> <div id="novedades-carousel-indicator" class="flex justify-center flex-wrap gap-2 max-w-[200px]" data-astro-cid-7gqybywi> ', ' </div> <button id="next-news" class="w-12 h-12 flex items-center justify-center bg-zinc-900 border border-zinc-800 text-unicode rounded-full active:scale-95 transition-all shadow-lg hover:border-unicode/50" aria-label="Siguiente" data-astro-cid-7gqybywi> <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" data-astro-cid-7gqybywi> <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" data-astro-cid-7gqybywi></path> </svg> </button> </div> </div> </div> </section>  <script>\n  function initNewsCarousel() {\n    const track = document.getElementById("novedades-track");\n    const indicator = document.getElementById("novedades-carousel-indicator");\n\n    if (!track || !indicator) return;\n\n    const dots = indicator.querySelectorAll("button");\n    const cards = track.querySelectorAll(".novedad-item");\n    const prevBtn = document.getElementById("prev-news");\n    const nextBtn = document.getElementById("next-news");\n\n    let currentIndex = 0;\n    let isDragging = false;\n    let startPos = 0;\n    let currentTranslate = 0;\n    let prevTranslate = 0;\n\n    const getVisibleCardsCount = () => {\n      if (window.innerWidth >= 1024) return 3; // lg\n      if (window.innerWidth >= 768) return 2; // md\n      return 1; // default mobile\n    };\n\n    const getMaxIndex = () => {\n      return Math.max(0, cards.length - getVisibleCardsCount());\n    };\n\n    // Scroll by width of one item + gap\n    const getScrollStep = () => {\n      const firstItem = track.querySelector(".novedad-item");\n      if (!firstItem) return track.clientWidth;\n      const gap = parseInt(window.getComputedStyle(track).gap) || 0;\n      return firstItem.offsetWidth + gap;\n    };\n\n    const updateUIState = (index) => {\n      const maxIndex = getMaxIndex();\n\n      dots.forEach((dot, i) => {\n        // Ocultar din\xE1micamente puntos sin tarjetas a las cuales redirigir\n        if (i > maxIndex) {\n          dot.classList.add("hidden");\n        } else {\n          dot.classList.remove("hidden");\n        }\n\n        if (i === index) {\n          dot.classList.add("bg-unicode", "w-6");\n          dot.classList.remove("bg-zinc-800");\n        } else {\n          dot.classList.remove("bg-unicode", "w-6");\n          dot.classList.add("bg-zinc-800");\n        }\n      });\n\n      cards.forEach((card, i) => {\n        const visibleCount = getVisibleCardsCount();\n        if (i >= index && i < index + visibleCount) {\n          // Agrandamos solo las visibles en pantalla actual\n          card.classList.add("scale-100", "opacity-100");\n          card.classList.remove("scale-95", "opacity-50");\n        } else {\n          card.classList.remove("scale-100", "opacity-100");\n          card.classList.add("scale-95", "opacity-50");\n        }\n      });\n\n      // Efecto visual de deshabilitar botones al llegar a l\xEDmites\n      if (prevBtn) {\n        prevBtn.style.opacity = index <= 0 ? "0.3" : "1";\n        prevBtn.style.pointerEvents = index <= 0 ? "none" : "auto";\n      }\n      if (nextBtn) {\n        nextBtn.style.opacity = index >= maxIndex ? "0.3" : "1";\n        nextBtn.style.pointerEvents = index >= maxIndex ? "none" : "auto";\n      }\n    };\n\n    const setPositionByIndex = () => {\n      const step = getScrollStep();\n      const maxIndex = getMaxIndex();\n\n      // Limitar \xEDndices para no ver agujeros negros\n      if (currentIndex > maxIndex) currentIndex = maxIndex;\n      if (currentIndex < 0) currentIndex = 0;\n\n      currentTranslate = currentIndex * -step;\n      prevTranslate = currentTranslate;\n      track.style.transform = `translateX(${currentTranslate}px)`;\n      updateUIState(currentIndex);\n    };\n\n    if (prevBtn && nextBtn) {\n      prevBtn.addEventListener("click", () => {\n        if (currentIndex > 0) {\n          currentIndex -= 1;\n          setPositionByIndex();\n        }\n      });\n      nextBtn.addEventListener("click", () => {\n        if (currentIndex < getMaxIndex()) {\n          currentIndex += 1;\n          setPositionByIndex();\n        }\n      });\n    }\n\n    dots.forEach((dot) => {\n      dot.addEventListener("click", () => {\n        currentIndex = parseInt(dot.getAttribute("data-index") || "0");\n        setPositionByIndex();\n      });\n    });\n\n    // Touch Support para M\xF3viles\n    track.addEventListener("touchstart", touchStart);\n    track.addEventListener("touchend", touchEnd);\n    track.addEventListener("touchmove", touchMove);\n    track.addEventListener("mousedown", touchStart);\n    track.addEventListener("mouseup", touchEnd);\n    track.addEventListener("mouseleave", () => {\n      if (isDragging) touchEnd();\n    });\n    track.addEventListener("mousemove", touchMove);\n\n    function touchStart(event) {\n      isDragging = true;\n      startPos = getPositionX(event);\n      if (track)\n        track.classList.remove(\n          "transition-transform",\n          "duration-700",\n          "ease-in-out",\n        );\n    }\n\n    function touchMove(event) {\n      if (isDragging && track) {\n        const currentPosition = getPositionX(event);\n        const diff = currentPosition - startPos;\n        track.style.transform = `translateX(${prevTranslate + diff}px)`;\n      }\n    }\n\n    function touchEnd() {\n      if (!track) return;\n      isDragging = false;\n      const movedBy = currentTranslate - prevTranslate;\n      track.classList.add(\n        "transition-transform",\n        "duration-700",\n        "ease-in-out",\n      );\n\n      const transformMatrix = window\n        .getComputedStyle(track)\n        .getPropertyValue("transform");\n      let currentX = prevTranslate;\n      if (transformMatrix !== "none") {\n        currentX = parseFloat(transformMatrix.split(",")[4]) || 0;\n      }\n\n      const diff = currentX - prevTranslate;\n\n      if (diff < -100 && currentIndex < getMaxIndex()) currentIndex += 1;\n      if (diff > 100 && currentIndex > 0) currentIndex -= 1;\n\n      setPositionByIndex();\n    }\n\n    function getPositionX(event) {\n      return event.type.includes("mouse")\n        ? event.pageX\n        : event.touches[0].clientX;\n    }\n\n    // Resize event logic\n    window.addEventListener("resize", () => {\n      setPositionByIndex();\n    });\n\n    // Inicializar\n    updateUIState(0);\n  }\n\n  // Run on initial load\n  initNewsCarousel();\n\n  // Run on Astro View Transitions\n  document.addEventListener("astro:page-load", initNewsCarousel);\n<\/script>'], ["", '<section id="novedades" class="w-full py-16 md:py-24 relative" data-astro-cid-7gqybywi> <div class="max-w-6xl mx-auto px-6" data-astro-cid-7gqybywi> <!-- T\xEDtulo principal --> <div class="text-center mb-16" data-astro-cid-7gqybywi> <h2 class="text-4xl md:text-6xl font-bold text-unicode text-glow tracking-wider uppercase" data-astro-cid-7gqybywi>\nNOVEDADES\n</h2> </div> <!-- Carrusel de tarjetas --> <div class="relative group/news-carousel w-full overflow-hidden" data-astro-cid-7gqybywi> <!-- "track" envuelve las tarjetas y servir\xE1 para moverlas con translate --> <div id="novedades-track" class="flex gap-6 lg:gap-8 pb-4 md:pb-0 transition-transform duration-700 ease-in-out cursor-grab active:cursor-grabbing w-full" data-astro-cid-7gqybywi> ', ' </div> <!-- Arrow Controls & Indicator (All views) --> <div class="flex items-center justify-center gap-6 mt-10" data-astro-cid-7gqybywi> <button id="prev-news" class="w-12 h-12 flex items-center justify-center bg-zinc-900 border border-zinc-800 text-unicode rounded-full active:scale-95 transition-all shadow-lg hover:border-unicode/50" aria-label="Anterior" data-astro-cid-7gqybywi> <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" data-astro-cid-7gqybywi> <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" data-astro-cid-7gqybywi></path> </svg> </button> <div id="novedades-carousel-indicator" class="flex justify-center flex-wrap gap-2 max-w-[200px]" data-astro-cid-7gqybywi> ', ' </div> <button id="next-news" class="w-12 h-12 flex items-center justify-center bg-zinc-900 border border-zinc-800 text-unicode rounded-full active:scale-95 transition-all shadow-lg hover:border-unicode/50" aria-label="Siguiente" data-astro-cid-7gqybywi> <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" data-astro-cid-7gqybywi> <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" data-astro-cid-7gqybywi></path> </svg> </button> </div> </div> </div> </section>  <script>\n  function initNewsCarousel() {\n    const track = document.getElementById("novedades-track");\n    const indicator = document.getElementById("novedades-carousel-indicator");\n\n    if (!track || !indicator) return;\n\n    const dots = indicator.querySelectorAll("button");\n    const cards = track.querySelectorAll(".novedad-item");\n    const prevBtn = document.getElementById("prev-news");\n    const nextBtn = document.getElementById("next-news");\n\n    let currentIndex = 0;\n    let isDragging = false;\n    let startPos = 0;\n    let currentTranslate = 0;\n    let prevTranslate = 0;\n\n    const getVisibleCardsCount = () => {\n      if (window.innerWidth >= 1024) return 3; // lg\n      if (window.innerWidth >= 768) return 2; // md\n      return 1; // default mobile\n    };\n\n    const getMaxIndex = () => {\n      return Math.max(0, cards.length - getVisibleCardsCount());\n    };\n\n    // Scroll by width of one item + gap\n    const getScrollStep = () => {\n      const firstItem = track.querySelector(".novedad-item");\n      if (!firstItem) return track.clientWidth;\n      const gap = parseInt(window.getComputedStyle(track).gap) || 0;\n      return firstItem.offsetWidth + gap;\n    };\n\n    const updateUIState = (index) => {\n      const maxIndex = getMaxIndex();\n\n      dots.forEach((dot, i) => {\n        // Ocultar din\xE1micamente puntos sin tarjetas a las cuales redirigir\n        if (i > maxIndex) {\n          dot.classList.add("hidden");\n        } else {\n          dot.classList.remove("hidden");\n        }\n\n        if (i === index) {\n          dot.classList.add("bg-unicode", "w-6");\n          dot.classList.remove("bg-zinc-800");\n        } else {\n          dot.classList.remove("bg-unicode", "w-6");\n          dot.classList.add("bg-zinc-800");\n        }\n      });\n\n      cards.forEach((card, i) => {\n        const visibleCount = getVisibleCardsCount();\n        if (i >= index && i < index + visibleCount) {\n          // Agrandamos solo las visibles en pantalla actual\n          card.classList.add("scale-100", "opacity-100");\n          card.classList.remove("scale-95", "opacity-50");\n        } else {\n          card.classList.remove("scale-100", "opacity-100");\n          card.classList.add("scale-95", "opacity-50");\n        }\n      });\n\n      // Efecto visual de deshabilitar botones al llegar a l\xEDmites\n      if (prevBtn) {\n        prevBtn.style.opacity = index <= 0 ? "0.3" : "1";\n        prevBtn.style.pointerEvents = index <= 0 ? "none" : "auto";\n      }\n      if (nextBtn) {\n        nextBtn.style.opacity = index >= maxIndex ? "0.3" : "1";\n        nextBtn.style.pointerEvents = index >= maxIndex ? "none" : "auto";\n      }\n    };\n\n    const setPositionByIndex = () => {\n      const step = getScrollStep();\n      const maxIndex = getMaxIndex();\n\n      // Limitar \xEDndices para no ver agujeros negros\n      if (currentIndex > maxIndex) currentIndex = maxIndex;\n      if (currentIndex < 0) currentIndex = 0;\n\n      currentTranslate = currentIndex * -step;\n      prevTranslate = currentTranslate;\n      track.style.transform = \\`translateX(\\${currentTranslate}px)\\`;\n      updateUIState(currentIndex);\n    };\n\n    if (prevBtn && nextBtn) {\n      prevBtn.addEventListener("click", () => {\n        if (currentIndex > 0) {\n          currentIndex -= 1;\n          setPositionByIndex();\n        }\n      });\n      nextBtn.addEventListener("click", () => {\n        if (currentIndex < getMaxIndex()) {\n          currentIndex += 1;\n          setPositionByIndex();\n        }\n      });\n    }\n\n    dots.forEach((dot) => {\n      dot.addEventListener("click", () => {\n        currentIndex = parseInt(dot.getAttribute("data-index") || "0");\n        setPositionByIndex();\n      });\n    });\n\n    // Touch Support para M\xF3viles\n    track.addEventListener("touchstart", touchStart);\n    track.addEventListener("touchend", touchEnd);\n    track.addEventListener("touchmove", touchMove);\n    track.addEventListener("mousedown", touchStart);\n    track.addEventListener("mouseup", touchEnd);\n    track.addEventListener("mouseleave", () => {\n      if (isDragging) touchEnd();\n    });\n    track.addEventListener("mousemove", touchMove);\n\n    function touchStart(event) {\n      isDragging = true;\n      startPos = getPositionX(event);\n      if (track)\n        track.classList.remove(\n          "transition-transform",\n          "duration-700",\n          "ease-in-out",\n        );\n    }\n\n    function touchMove(event) {\n      if (isDragging && track) {\n        const currentPosition = getPositionX(event);\n        const diff = currentPosition - startPos;\n        track.style.transform = \\`translateX(\\${prevTranslate + diff}px)\\`;\n      }\n    }\n\n    function touchEnd() {\n      if (!track) return;\n      isDragging = false;\n      const movedBy = currentTranslate - prevTranslate;\n      track.classList.add(\n        "transition-transform",\n        "duration-700",\n        "ease-in-out",\n      );\n\n      const transformMatrix = window\n        .getComputedStyle(track)\n        .getPropertyValue("transform");\n      let currentX = prevTranslate;\n      if (transformMatrix !== "none") {\n        currentX = parseFloat(transformMatrix.split(",")[4]) || 0;\n      }\n\n      const diff = currentX - prevTranslate;\n\n      if (diff < -100 && currentIndex < getMaxIndex()) currentIndex += 1;\n      if (diff > 100 && currentIndex > 0) currentIndex -= 1;\n\n      setPositionByIndex();\n    }\n\n    function getPositionX(event) {\n      return event.type.includes("mouse")\n        ? event.pageX\n        : event.touches[0].clientX;\n    }\n\n    // Resize event logic\n    window.addEventListener("resize", () => {\n      setPositionByIndex();\n    });\n\n    // Inicializar\n    updateUIState(0);\n  }\n\n  // Run on initial load\n  initNewsCarousel();\n\n  // Run on Astro View Transitions\n  document.addEventListener("astro:page-load", initNewsCarousel);\n<\/script>'])), maybeRenderHead(), novedades.map((novedad) => renderTemplate`<div class="novedad-item flex-none w-[88vw] md:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1.33rem)] transition-all duration-700 ease-out transform scale-95 opacity-50" data-astro-cid-7gqybywi> ${renderComponent($$result, "NovedadCard", $$NovedadCard, { "title": novedad.title, "description": novedad.description, "image": novedad.image, "href": novedad.href, "data-astro-cid-7gqybywi": true })} </div>`), novedades.map((_, i) => renderTemplate`<button${addAttribute(`w-2 h-2 rounded-full transition-all duration-300 ${i === 0 ? "bg-unicode w-6" : "bg-zinc-800"}`, "class")}${addAttribute(`Ir a novedad ${i + 1}`, "aria-label")}${addAttribute(i, "data-index")} data-astro-cid-7gqybywi></button>`));
}, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/components/components-home/Novedades.astro", void 0);

const $$Nosotros = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<section id="nosotros" class="w-full py-12 md:py-16 relative"> <div class="max-w-6xl mx-auto px-6"> <!-- Título principal --> <div class="text-center mb-8"> <h2 class="text-4xl md:text-5xl font-bold text-unicode text-glow tracking-wider uppercase">
NOSOTROS
</h2> </div> <!-- Grid de fotos --> <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8 mb-10 max-w-5xl mx-auto"> <div class="rounded-3xl overflow-hidden border border-zinc-800"> <img src="/home-img1.webp" alt="Evento UNICODE - Equipo en auditorio" class="w-full h-56 sm:h-72 lg:h-80 object-cover" loading="lazy"> </div> <div class="rounded-3xl overflow-hidden border border-zinc-800"> <img src="/home-img2.webp" alt="Evento UNICODE - Grupo de miembros" class="w-full h-56 sm:h-72 lg:h-80 object-cover" loading="lazy"> </div> </div> <!-- Subtítulo y descripción --> <div class="text-center max-w-3xl mx-auto mb-10"> <h3 class="text-2xl md:text-3xl font-bold text-white mb-4">
Centro Cultural UNICODE
</h3> <p class="text-zinc-400 text-sm md:text-base leading-relaxed">
El Centro Cultural UNICODE es un espacio vibrante dedicado a fomentar la
        creatividad, el aprendizaje y la conexión entre la comunidad. Ofrecemos
        a nuestra comunidad una amplia gama de actividades y recursos para
        enriquecer la vida cultural de nuestros miembros.
</p> </div> <!-- Tarjetas de Misión y Visión --> <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto"> <!-- Nuestra Misión --> <div class="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 transition-all duration-300 hover:border-unicode/30"> <h4 class="text-lg md:text-xl font-bold text-unicode mb-2">
Nuestra Misión
</h4> <p class="text-zinc-400 text-sm md:text-base leading-relaxed">
Inspirar y empoderar a través de las artes, promoviendo la expresión
          individual y colectiva, y construyendo una comunidad cultural sólida e
          inclusiva.
</p> </div> <!-- Nuestra Visión --> <div class="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 transition-all duration-300 hover:border-unicode/30"> <h4 class="text-lg md:text-xl font-bold text-unicode mb-2">
Nuestra Visión
</h4> <p class="text-zinc-400 text-sm md:text-base leading-relaxed">
Ser el epicentro cultural de la universidad, reconocido por nuestra
          innovación, diversidad y contribución al desarrollo integral de
          nuestros miembros y la sociedad.
</p> </div> </div> </div> </section>`;
}, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/components/components-home/Nosotros.astro", void 0);

const CentroCulturalDeCiberseguridad = new Proxy({"src":"/_astro/Centro-Cultural-de-Ciberseguridad.DQeDGqNX.png","width":312,"height":318,"format":"png"}, {
						get(target, name, receiver) {
							if (name === 'clone') {
								return structuredClone(target);
							}
							if (name === 'fsPath') {
								return "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/assets/allianceLogos/Centro-Cultural-de-Ciberseguridad.png";
							}
							
							return target[name];
						}
					});

const __vite_glob_0_0 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: CentroCulturalDeCiberseguridad
}, Symbol.toStringTag, { value: 'Module' }));

const CibersecUNI = new Proxy({"src":"/_astro/CibersecUNI.C7OX7LOx.png","width":1563,"height":1563,"format":"png"}, {
						get(target, name, receiver) {
							if (name === 'clone') {
								return structuredClone(target);
							}
							if (name === 'fsPath') {
								return "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/assets/allianceLogos/CibersecUNI.png";
							}
							
							return target[name];
						}
					});

const __vite_glob_0_1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: CibersecUNI
}, Symbol.toStringTag, { value: 'Module' }));

const DataScienceResearchPer_ = new Proxy({"src":"/_astro/Data-Science-Research-Perú.2F067zBS.png","width":600,"height":200,"format":"png"}, {
						get(target, name, receiver) {
							if (name === 'clone') {
								return structuredClone(target);
							}
							if (name === 'fsPath') {
								return "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/assets/allianceLogos/Data-Science-Research-Perú.png";
							}
							
							return target[name];
						}
					});

const __vite_glob_0_2 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: DataScienceResearchPer_
}, Symbol.toStringTag, { value: 'Module' }));

const IAHEUNI = new Proxy({"src":"/_astro/IAHE-UNI.CuqqhD_S.jpeg","width":834,"height":633,"format":"jpg"}, {
						get(target, name, receiver) {
							if (name === 'clone') {
								return structuredClone(target);
							}
							if (name === 'fsPath') {
								return "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/assets/allianceLogos/IAHE-UNI.jpeg";
							}
							
							return target[name];
						}
					});

const __vite_glob_0_3 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: IAHEUNI
}, Symbol.toStringTag, { value: 'Module' }));

const IEEEComputerSocietyUPC = new Proxy({"src":"/_astro/IEEE-Computer-Society-UPC.C6aYuhuh.png","width":2389,"height":1831,"format":"png"}, {
						get(target, name, receiver) {
							if (name === 'clone') {
								return structuredClone(target);
							}
							if (name === 'fsPath') {
								return "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/assets/allianceLogos/IEEE-Computer-Society-UPC.png";
							}
							
							return target[name];
						}
					});

const __vite_glob_0_4 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: IEEEComputerSocietyUPC
}, Symbol.toStringTag, { value: 'Module' }));

const InnovaUNMSM = new Proxy({"src":"/_astro/Innova-UNMSM.CmuOk2nW.jpeg","width":890,"height":443,"format":"jpg"}, {
						get(target, name, receiver) {
							if (name === 'clone') {
								return structuredClone(target);
							}
							if (name === 'fsPath') {
								return "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/assets/allianceLogos/Innova-UNMSM.jpeg";
							}
							
							return target[name];
						}
					});

const __vite_glob_0_5 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: InnovaUNMSM
}, Symbol.toStringTag, { value: 'Module' }));

const LEADUTP = new Proxy({"src":"/_astro/LEAD-UTP.B0CJ-QhF.jpg","width":1080,"height":1080,"format":"jpg","orientation":1}, {
						get(target, name, receiver) {
							if (name === 'clone') {
								return structuredClone(target);
							}
							if (name === 'fsPath') {
								return "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/assets/allianceLogos/LEAD-UTP.jpg";
							}
							
							return target[name];
						}
					});

const __vite_glob_0_6 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: LEADUTP
}, Symbol.toStringTag, { value: 'Module' }));

const $$Alianzas = createComponent(($$result, $$props, $$slots) => {
  const allianceImages = /* #__PURE__ */ Object.assign({"/src/assets/allianceLogos/Centro-Cultural-de-Ciberseguridad.png": __vite_glob_0_0,"/src/assets/allianceLogos/CibersecUNI.png": __vite_glob_0_1,"/src/assets/allianceLogos/Data-Science-Research-Perú.png": __vite_glob_0_2,"/src/assets/allianceLogos/IAHE-UNI.jpeg": __vite_glob_0_3,"/src/assets/allianceLogos/IEEE-Computer-Society-UPC.png": __vite_glob_0_4,"/src/assets/allianceLogos/Innova-UNMSM.jpeg": __vite_glob_0_5,"/src/assets/allianceLogos/LEAD-UTP.jpg": __vite_glob_0_6


});
  const alianzas = Object.entries(allianceImages).map(([path, module]) => {
    const fileName = path.split("/").pop() || "";
    const rawName = fileName.split(".")[0];
    let scale = "scale-100";
    let hoverScale = "group-hover:scale-110";
    let brightness = "brightness-200";
    if (rawName.includes("CibersecUNI")) {
      scale = "scale-[1.8]";
      hoverScale = "group-hover:scale-[2.0]";
    } else if (rawName.includes("LEAD-UTP")) {
      scale = "scale-[2.8]";
      hoverScale = "group-hover:scale-[3.1]";
      brightness = "brightness-[250%]";
    } else if (rawName.includes("Data-Science")) {
      scale = "scale-[0.85]";
      hoverScale = "group-hover:scale-[0.95]";
    }
    return {
      name: rawName.replace(/-/g, " "),
      logo: module.default.src,
      scale,
      hoverScale,
      brightness
    };
  });
  const alianzasFila1 = [...alianzas];
  const alianzasFila2 = [...alianzas].reverse();
  return renderTemplate`${maybeRenderHead()}<section id="alianzas" class="w-full py-16 md:py-24 relative overflow-hidden" data-astro-cid-4gx6ajpl> <div class="max-w-7xl mx-auto px-6" data-astro-cid-4gx6ajpl> <!-- Título --> <div class="text-center mb-6" data-astro-cid-4gx6ajpl> <h2 class="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight" data-astro-cid-4gx6ajpl>
NUESTRAS <span class="text-unicode text-glow" data-astro-cid-4gx6ajpl>ALIANZAS</span> </h2> </div> <!-- Subtítulo --> <p class="text-zinc-300/80 text-sm md:text-base text-center max-w-xl mx-auto mb-14 leading-relaxed" data-astro-cid-4gx6ajpl>
Trabajamos de la mano con organizaciones de primer nivel para potenciar la educación 
      y fomentar el desarrollo tecnológico en nuestra comunidad.
</p> <!-- Carruseles Infinitos --> <div class="flex flex-col gap-2 overflow-hidden mask-image-fade py-6" data-astro-cid-4gx6ajpl> <!-- Fila 1: Derecha a Izquierda --> <div class="relative w-full flex overflow-hidden py-14 -my-4" data-astro-cid-4gx6ajpl> <div class="animate-marquee flex gap-12 whitespace-nowrap items-center h-full" data-astro-cid-4gx6ajpl> ${[...alianzasFila1, ...alianzasFila1, ...alianzasFila1].map(
    (alianza) => renderTemplate`<div class="group relative flex items-center justify-center min-w-[140px] md:min-w-[180px] h-20 md:h-28 transition-all duration-300" data-astro-cid-4gx6ajpl> <img${addAttribute(alianza.logo, "src")}${addAttribute(alianza.name, "alt")}${addAttribute(alianza.name, "title")}${addAttribute(`h-12 md:h-16 w-auto object-contain opacity-40 grayscale ${alianza.brightness} ${alianza.scale} ${alianza.hoverScale} contrast-125 group-hover:opacity-100 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-500`, "class")} data-astro-cid-4gx6ajpl> <!-- Tooltip (Punto medio ideal) --> <div class="absolute -top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-hover:-top-11 transition-all duration-500 pointer-events-none z-50" data-astro-cid-4gx6ajpl> <span class="bg-zinc-900/95 text-unicode text-[10px] md:text-sm font-bold px-4 py-2 rounded-full border border-unicode/40 whitespace-nowrap shadow-2xl backdrop-blur-md" data-astro-cid-4gx6ajpl> ${alianza.name} </span> </div> </div>`
  )} </div> </div> <!-- Fila 2: Izquierda a Derecha --> <div class="relative w-full flex overflow-hidden py-14 -my-4" data-astro-cid-4gx6ajpl> <div class="animate-marquee-reverse flex gap-12 whitespace-nowrap items-center h-full" data-astro-cid-4gx6ajpl> ${[...alianzasFila2, ...alianzasFila2, ...alianzasFila2].map(
    (alianza) => renderTemplate`<div class="group relative flex items-center justify-center min-w-[140px] md:min-w-[180px] h-20 md:h-28 transition-all duration-300" data-astro-cid-4gx6ajpl> <img${addAttribute(alianza.logo, "src")}${addAttribute(alianza.name, "alt")}${addAttribute(alianza.name, "title")}${addAttribute(`h-12 md:h-16 w-auto object-contain opacity-40 grayscale ${alianza.brightness} ${alianza.scale} ${alianza.hoverScale} contrast-125 group-hover:opacity-100 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-500`, "class")} data-astro-cid-4gx6ajpl> <!-- Tooltip (Punto medio ideal) --> <div class="absolute -top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-hover:-top-11 transition-all duration-500 pointer-events-none z-50" data-astro-cid-4gx6ajpl> <span class="bg-zinc-900/95 text-unicode text-[10px] md:text-sm font-bold px-4 py-2 rounded-full border border-unicode/40 whitespace-nowrap shadow-2xl backdrop-blur-md" data-astro-cid-4gx6ajpl> ${alianza.name} </span> </div> </div>`
  )} </div> </div> </div> </div> </section> `;
}, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/components/components-home/Alianzas.astro", void 0);

const $$ExploraUnicode = createComponent(($$result, $$props, $$slots) => {
  const items = [
    {
      title: "\xC1reas",
      href: "/areas",
      buttonText: "Ver \xE1reas",
      icon: "areas"
    },
    {
      title: "Eventos",
      href: "/eventos",
      buttonText: "Ver eventos",
      icon: "eventos"
    },
    {
      title: "Proyectos",
      href: "/projects",
      buttonText: "Ver proyectos",
      icon: "proyectos"
    },
    {
      title: "Convocatoria",
      href: "/call",
      buttonText: "Ver convocatoria",
      icon: "convocatoria"
    }
  ];
  return renderTemplate`${maybeRenderHead()}<section id="explora" class="w-full py-16 md:py-24 relative"> <div class="max-w-5xl mx-auto px-6"> <!-- Título --> <div class="text-center mb-6"> <h2 class="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
EXPLORA <span class="text-unicode text-glow">UNICODE</span> </h2> </div> <!-- Subtítulo --> <p class="text-zinc-400 text-sm md:text-base text-center mb-14">
Descubre nuestros pilares y participa.
</p> <!-- Grid de tarjetas --> <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"> ${items.map((item) => renderTemplate`<div class="group bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 md:p-8 flex flex-col items-center text-center transition-all duration-300 hover:border-unicode/40 hover:bg-zinc-900/90">  <div class="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-unicode/10 border border-unicode/20 flex items-center justify-center mb-5 group-hover:bg-unicode/15 transition-colors duration-300"> ${item.icon === "areas" && renderTemplate`<svg class="w-8 h-8 md:w-10 md:h-10 text-unicode" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"> <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"></path> </svg>`} ${item.icon === "eventos" && renderTemplate`<svg class="w-8 h-8 md:w-10 md:h-10 text-unicode" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"> <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"></path> </svg>`} ${item.icon === "proyectos" && renderTemplate`<svg class="w-8 h-8 md:w-10 md:h-10 text-unicode" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"> <path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"></path> </svg>`} ${item.icon === "convocatoria" && renderTemplate`<svg class="w-8 h-8 md:w-10 md:h-10 text-unicode" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"> <path stroke-linecap="round" stroke-linejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46"></path> </svg>`} </div>  <h3 class="text-white font-bold text-base md:text-lg mb-4 group-hover:text-unicode transition-colors duration-300"> ${item.title} </h3>  <a${addAttribute(item.href, "href")} class="px-6 py-2 bg-unicode hover:bg-unicode-light text-black font-bold text-xs rounded-full transition-all duration-300 shadow-unicode hover:shadow-unicode-lg"> ${item.buttonText} </a> </div>`)} </div> </div> </section>`;
}, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/components/components-home/ExploraUnicode.astro", void 0);

const $$Presidentes = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<section class="w-full py-16 md:py-24 bg-[#050505] relative overflow-hidden"> <!-- Brillo decorativo de fondo --> <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-unicode/5 rounded-full blur-[100px] pointer-events-none"></div> <div class="max-w-7xl mx-auto px-6 text-center relative z-10"> <!-- Título principal --> <h2 class="text-4xl md:text-5xl font-extrabold text-unicode text-glow mb-16 uppercase tracking-tight">
Presidentes
</h2> <div class="flex flex-col sm:flex-row items-center justify-center gap-16 sm:gap-32 md:gap-40"> <!-- Presidente 1 --> <div class="flex flex-col items-center group"> <div class="w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden border border-zinc-800 group-hover:border-unicode/50 group-hover:shadow-unicode transition-all duration-300 mb-6 bg-zinc-900/50"> <img src="/Christopher_Albino.webp" alt="Presidente 1" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy"> </div> <h3 class="text-2xl font-bold text-white mb-2 group-hover:text-unicode transition-colors">
Christopher Albino
</h3> <a href="https://www.linkedin.com/in/christopher-henrry-albino-soto-880a48189/" target="_blank" rel="noopener noreferrer" class="flex items-center gap-1.5 transition-colors mt-0.5"> <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"> <path d="M20.447 20.452H16.89V14.881C16.89 13.551 16.866 11.838 15.04 11.838C13.19 11.838 12.906 13.284 12.906 14.787V20.452H9.351V9H12.768V10.564H12.816C13.292 9.662 14.456 8.708 16.204 8.708C19.827 8.708 20.447 11.092 20.447 14.168V20.452ZM5.337 7.433C4.195 7.433 3.268 6.505 3.268 5.363C3.268 4.22 4.195 3.293 5.337 3.293C6.478 3.293 7.406 4.22 7.406 5.363C7.406 6.505 6.478 7.433 5.337 7.433ZM7.118 20.452H3.555V9H7.118V20.452ZM22.225 0H1.771C0.792 0 0 0.774 0 1.729V22.271C0 23.227 0.792 24 1.771 24H22.222C23.2 24 24 23.227 24 22.271V1.729C24 0.774 23.2 0 22.225 0Z" fill="#0A66C2"></path> </svg> <span class="text-sm font-medium text-zinc-400 hover:text-[#0A66C2] transition-colors duration-200">LinkedIn</span> </a> </div> <!-- Presidente 2 --> <div class="flex flex-col items-center group"> <!-- Foto --> <div class="w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden border border-zinc-800 group-hover:border-unicode/50 group-hover:shadow-unicode transition-all duration-300 mb-6 bg-zinc-900/50"> <img src="/Ricco_Rashuaman.webp" alt="Presidente 2" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy"> </div> <!-- Nombre y LinkedIn --> <h3 class="text-2xl font-bold text-white mb-2 group-hover:text-unicode transition-colors">
Ricco Rashuaman
</h3> <a href="https://www.linkedin.com/in/ricco-didier-rashuaman-sapallanay-b88880289/" target="_blank" rel="noopener noreferrer" class="flex items-center gap-1.5 transition-colors mt-0.5"> <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"> <path d="M20.447 20.452H16.89V14.881C16.89 13.551 16.866 11.838 15.04 11.838C13.19 11.838 12.906 13.284 12.906 14.787V20.452H9.351V9H12.768V10.564H12.816C13.292 9.662 14.456 8.708 16.204 8.708C19.827 8.708 20.447 11.092 20.447 14.168V20.452ZM5.337 7.433C4.195 7.433 3.268 6.505 3.268 5.363C3.268 4.22 4.195 3.293 5.337 3.293C6.478 3.293 7.406 4.22 7.406 5.363C7.406 6.505 6.478 7.433 5.337 7.433ZM7.118 20.452H3.555V9H7.118V20.452ZM22.225 0H1.771C0.792 0 0 0.774 0 1.729V22.271C0 23.227 0.792 24 1.771 24H22.222C23.2 24 24 23.227 24 22.271V1.729C24 0.774 23.2 0 22.225 0Z" fill="#0A66C2"></path> </svg> <span class="text-sm font-medium text-zinc-400 hover:text-[#0A66C2] transition-colors duration-200">LinkedIn</span> </a> </div> </div> </div> </section>`;
}, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/components/components-home/Presidentes.astro", void 0);

const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Inicio" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "Navbar", $$Navbar, {})} ${renderComponent($$result2, "Hero", $$Hero, {})} ${maybeRenderHead()}<main class="w-full"> <div class="w-full h-px bg-linear-to-r from-transparent via-zinc-800 to-transparent"></div> ${renderComponent($$result2, "Stats", $$Stats, {})} <div class="w-full h-px bg-linear-to-r from-transparent via-zinc-800 to-transparent"></div> ${renderComponent($$result2, "Novedades", $$Novedades, {})} <div class="w-full h-px bg-linear-to-r from-transparent via-zinc-800 to-transparent"></div> ${renderComponent($$result2, "Nosotros", $$Nosotros, {})} <div class="w-full h-px bg-linear-to-r from-transparent via-zinc-800 to-transparent"></div> ${renderComponent($$result2, "Alianzas", $$Alianzas, {})} <div class="w-full h-px bg-linear-to-r from-transparent via-zinc-800 to-transparent"></div> ${renderComponent($$result2, "ExploraUnicode", $$ExploraUnicode, {})} <div class="w-full h-px bg-linear-to-r from-transparent via-zinc-800 to-transparent"></div> ${renderComponent($$result2, "Presidentes", $$Presidentes, {})} </main> ` })}`;
}, "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/pages/index.astro", void 0);

const $$file = "D:/Carpeta_de_clases_2023-2025/ID-UNICODE/Unicode/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
