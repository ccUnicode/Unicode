# Arquitectura y Stack Tecnológico

El proyecto fue construido bajo las siguientes tecnologías y herramientas para asegurar escalabilidad, rendimiento y mantenibilidad:

## Componentes del Stack

1. **Astro**: Framework principal utilizado por su enfoque *Island Architecture*, permitiendo enviar mínima cantidad de JavaScript al cliente y optimizando los tiempos de carga (LCP < 2.5s).
2. **Tailwind CSS**: Utilizado para la construcción de interfaces responsivas y diseño rápido basado en utilidades, manteniendo una guía de marca (Dark theme, Verde Neón).
3. **TypeScript**: Implementado en el proyecto para garantizar un tipado estricto, autocompletado y prevención de errores en tiempo de desarrollo.
4. **Supabase / PostgreSQL**: Base de datos para la gestión del panel administrativo referente a las convocatorias.
5. **Sharp**: Procesamiento y optimización de imágenes (WebP).
6. **Git y GitHub**: Para el control de versiones y el trabajo en equipo de forma ordenada.

## Rendimiento y SEO
- **WebP**: Todas las imágenes optimizadas al formato WebP (~90% reducción peso).
- **Lazy Loading**: Implementado en imágenes below-the-fold para mejorar LCP.
- **OG Tags**: Configuración de meta-tags Open Graph en `Layout.astro`.

## Estructura de Diseño (UI/UX)
- **Tema Visual**: Principalmente oscuro (*Dark theme*) con acentos de color verde neón representando la identidad de UNICODE.
- **Tipografía y UI**: Implementados siguiendo guías limpias, modernas y orientadas a la experiencia del usuario (UX).
- **Diseño Responsive (Mobile First)**: 
  - *Móvil*: 320px - 480px. 
  - *Tablet*: 481px - 1024px. 
  - *Desktop*: > 1025px.
