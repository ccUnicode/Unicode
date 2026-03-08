#Unicode - Landing Page

![Astro](https://img.shields.io/badge/Astro-0C0F19?style=for-the-badge&logo=astro&logoColor=white) 
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white) 
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

Bienvenido al repositorio oficial de la **Landing Page de Unicode**. Este proyecto está construido con una arquitectura moderna utilizando las mejores prácticas de **Astro**, **Tailwind CSS** y **Supabase** para ofrecer un rendimiento ultra rápido y una experiencia de usuario excepcional (tema oscuro con acentos en verde neón).

---

## 🗺️ Estructura de la Web y Contenidos

De acuerdo a los requerimientos oficiales del centro cultural, esta plataforma cuenta con las siguientes vistas principales y secciones:

- **Inicio (Home):** Hero Section, Novedades, Métricas de trayectoria (proyectos, eventos, miembros), sección "Nosotros" (Misión y Visión), logos de alianzas y enlaces a las redes sociales del centro.
- **Áreas:** Listado de todas las áreas del centro cultural y páginas de detalle (información, directores activos y sus respectivos proyectos).
- **Proyectos:** Directorio categorizado (Activos y Pasados) con sus páginas propias incluyendo objetivos, integrantes responsables y galería visual.
- **Eventos:** Sistema de eventos con póster/portada, calendario de próximos eventos, eventos previamente realizados y detalles de horarios y ubicaciones.
- **Convocatoria:** Portal de postulación directo con información actualizada sobre accesos, fechas límite (estado activo/cerrado) y botón de registro veloz.

##Tecnologías Principales

- **[Astro](https://astro.build/)**: Framework web enfocado en la velocidad y el rendimiento (LCP optimizado).
- **[Tailwind CSS (v4)](https://tailwindcss.com/)**: Framework CSS utilitario para un diseño responsivo y a medida siguiendo nuestro sistema de diseño.
- **[Supabase](https://supabase.com/)**: Backend as a Service (BaaS) de código abierto y base de datos PostgreSQL.

## Estructura del Proyecto

Una visión general de la arquitectura básica:

```text
/
├── public/           # Archivos estáticos e imágenes (favicon, etc.)
├── src/
│   ├── assets/       # Recursos como imágenes e íconos locales
│   ├── components/   # Componentes modulares y reutilizables de UI
│   ├── layouts/      # Plantillas base (Layouts) de la aplicación
│   ├── pages/        # Páginas accesibles mediante enrutamiento
│   └── styles/       # Hojas de estilo globales (global.css)
├── supabase/         # Archivos de configuración y esquemas de base de datos (schema.sql)
├── astro.config.mjs  # Configuración principal de Astro
├── package.json      # Dependencias y scripts de Node.js
└── README.md         # Documentación del proyecto
```

##Instalación y Configuración

Sigue estos pasos para ejecutar el proyecto en tu entorno local:

### 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd Unicode
```

### 2. Instalar dependencias

Asegúrate de tener Node.js instalado (v18+ recomendado).

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto y añade tus credenciales de Supabase:

```env
PUBLIC_SUPABASE_URL=tu_supabase_url
PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

### 4. Iniciar el servidor de desarrollo

```bash
npm run dev
```

El sitio estará disponible de forma local en `http://localhost:4321/`.

##Comandos Útiles

| Comando                   | Descripción                                                    |
| :------------------------ | :------------------------------------------------------------- |
| `npm run dev`             | Inicia el servidor de desarrollo en `localhost:4321`           |
| `npm run build`           | Construye el sitio para producción en la carpeta `./dist/`     |
| `npm run preview`         | Previsualiza el sitio de producción localmente antes de subirlo|
| `npm run astro -- --help` | Muestra la ayuda de la CLI de Astro                            |

##Guía de Estilos y Buenas Prácticas

- **Diseño UI/UX:** El proyecto utiliza estrictamente la guía de marca oficial de UNICODE, priorizando un tema oscuro atractivo con detalles en verde neón.
- **Tipado Fuerte:** Se utilizan tipos estrictos en TypeScript y esquemas estructurados para interactuar con la base de datos Supabase, previniendo errores.
- **Rendimiento UI:** Implementación de arquitectura de islas de Astro, gestión de imágenes eficiente, y reducción del tiempo de carga (LCP < 2.5s).

## 📄 Créditos

Desarrollado para **Unicode**. Todos los derechos reservados.
