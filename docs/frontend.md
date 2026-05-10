# Documentación del Frontend

Este documento detalla la arquitectura, estructura, componentes y las reglas de diseño (UI/UX) aplicadas en el frontend del proyecto "Unicode - Landing Page".

## 1. Arquitectura y Stack Tecnológico

El proyecto está diseñado bajo una arquitectura moderna enfocada en el rendimiento, escalabilidad y facilidad de mantenimiento.

- **Astro**: Framework principal. Se utiliza su enfoque *Island Architecture* para enviar la mínima cantidad de JavaScript al cliente. Esto permite optimizar los tiempos de carga logrando un Largest Contentful Paint (LCP) menor a 2.5s.
- **Tailwind CSS**: Framework CSS basado en utilidades para la construcción rápida de interfaces responsivas y consistentes.
- **TypeScript**: Garantiza un tipado estricto, autocompletado y previene errores en tiempo de desarrollo.
- **Procesamiento de Imágenes**: Todas las imágenes deben servirse optimizadas en formato WebP para una carga rápida. Adicionalmente, se emplea *Lazy Loading* en imágenes "below-the-fold".
- **SEO y Metadatos**: Uso de etiquetas semánticas y *OG Tags* (Open Graph) configuradas de forma centralizada en el layout base.

## 2. Estructura de Archivos

El frontend de Astro se encuentra principalmente dentro del directorio `src/`, y está estructurado en módulos lógicos.

```text
├── public/               # Archivos y recursos estáticos puros (favicon, imágenes locales sin procesar)
├── src/                  # Código fuente principal de la aplicación
│   ├── components/       # Componentes de UI reutilizables (Astro / React)
│   │   ├── components-home/  # Componentes exclusivos de la página de Inicio
│   │   └── components-call/  # Componentes exclusivos de la sección Convocatoria
│   ├── layouts/          # Plantillas base de HTML (Ej. Layout.astro)
│   ├── pages/            # Sistema de enrutamiento basado en archivos
│   │   └── api/          # Endpoints backend (Server-Side Rendering)
│   └── styles/           # Estilos globales (global.css)
├── tailwind.config.mjs   # Configuración de los tokens de diseño (colores, fuentes)
└── astro.config.mjs      # Configuración de Astro e integraciones
```

Esta modularidad permite separar responsabilidades, haciendo que múltiples desarrolladores puedan trabajar sin conflictos en diferentes secciones (Inicio vs Convocatoria).

## 3. Guía de Estilos UI/UX

El diseño visual del proyecto prioriza una experiencia de usuario (UX) moderna y atractiva, basada en los lineamientos oficiales de UNICODE:

### 3.1. Tema Visual
- **Tema Base**: *Dark theme* (Oscuro). Se debe emplear un esquema de colores oscuros para mantener un estilo premium e inmersivo.
- **Colores de Acento**: Verde neón. Utilizado estratégicamente para guiar la acción del usuario (CTAs, botones, enlaces, hover effects).

### 3.2. Responsive Design (Mobile First)
Todas las interfaces deben construirse aplicando utilidades responsivas de Tailwind CSS, garantizando compatibilidad en los siguientes *breakpoints*:
- **Móvil**: 320px - 480px (Diseño por defecto).
- **Tablet**: 481px - 1024px (`md:` / `lg:`).
- **Desktop**: > 1025px (`xl:`).

### 3.3. Usabilidad (UX)
- **Facilidad de navegación**: La interfaz debe ser autoexplicativa. Las acciones clave (2 o 3 clicks máximo) deben identificarse rápidamente.
- **Interactividad**: Los botones y enlaces deben contar con transiciones suaves (micro-interacciones) para indicar que son "clicables" (estados `hover` y `focus`).
- **Accesibilidad**: Asegurar un buen contraste de colores y uso de atributos `aria-` cuando corresponda.

## 4. Requisitos de Rendimiento

Para garantizar la retención del usuario y un buen posicionamiento:
- **LCP < 2.5s**: El tiempo de carga de la pintura de contenido más grande no debe exceder los 2.5 segundos en redes 4G estándar.
- **Peso Total de la Página**: No debe exceder los 2.5 MB.
- **Optimización de Medios**: Formato obligatorio WebP para imágenes. Tamaño máximo por archivo de alta resolución: 300 KB.
