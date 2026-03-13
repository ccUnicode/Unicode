# Estructura del Proyecto

El proyecto sigue una estructura de directorios convencional de Astro, separada en componentes lógicos para la página principal (*Home*) y otros módulos como *Convocatoria*.

```text
├── docs/                 # Documentación técnica y de requerimientos del proyecto
├── public/               # Recursos y assets estáticos (imágenes, íconos, favicon)
├── src/                  # Código fuente principal de la aplicación
│   ├── components/       # Componentes reutilizables e independientes de Astro y React
│   │   ├── components-home/  # Componentes dirigidos únicamente al Landing Page (Home)
│   │   └── components-call/  # Componentes dedicados exclusivamente a la página Convocatoria
│   ├── layouts/          # Elementos maestros compartidos (e.g. Layout.astro) responsable del marco base HTML
│   ├── pages/            # Archivos que generan las rutas (Routing) de Astro
│   │   └── api/          # Endpoints del backend (Server-side rendering, e.g. admin-login.ts)
│   └── styles/           # Archivos CSS globales para los estilos de Tailwind CSS
├── supabase/             # Archivos de la base de datos (configuración, migraciones)
├── astro.config.mjs      # Configuración general y de rendimiento de Astro
├── tailwind.config.mjs   # Configuración de variables, colores y clases de Tailwind CSS
└── tsconfig.json         # Configuración estricta para TypeScript del proyecto
```

## Modularidad

Esta estructura permite garantizar un proyecto que:
- Sea fácil de mantener por múltiples desarrolladores.
- Separe lógicamente las responsabilidades por contexto (Home vs Convocatoria).
- Aproveche el enrutamiento y creación de endpoints backend en `/src/pages` que provee Astro.
