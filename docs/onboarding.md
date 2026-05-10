# Guía de Onboarding y Mantenimiento

¡Bienvenido al equipo de desarrollo! Como la Landing Page de UNICODE se mantiene cada ciclo por equipos diferentes, esta guía te proporcionará los conocimientos necesarios para gestionar los contenidos del sitio y operar el panel de administración sin necesidad de alterar los componentes de la interfaz de usuario (UI).

## 1. Mantenimiento de Contenidos

El contenido dinámico del sitio se gestiona a través de archivos TypeScript estáticos ubicados en la carpeta `src/data/`.

### 1.1. Proyectos (`src/data/projects.ts`)
Aquí se listan todos los proyectos del centro cultural.
- **Agregar**: Duplica un objeto existente en el array `projects` y actualiza sus valores.
- **Destacar**: Añade o asegura que el proyecto tenga la propiedad `category: "Destacado"`. Esto lo hará visible en la sección principal de "Proyectos Destacados".
- **Estado**: Controla si el proyecto está `"Activo"` o `"Inactivo"` mediante la propiedad `status`.
- **Equipo**: Si algún miembro del equipo no posee fotografía, deja el campo vacío (`image: ""`). El sistema le asignará automáticamente un avatar de silueta.

### 1.2. Eventos (`src/data/events.ts`)
Los eventos se dividen en dos categorías principales dentro del mismo archivo:
- **Próximos Eventos (`proximosEventos`)**: Contiene los eventos futuros. Por diseño, la UI solo destacará el primero de la lista.
- **Historial (`eventosRealizados`)**: Eventos pasados. El sistema calcula automáticamente estadísticas (total de asistentes, categorías, etc.) basándose en este arreglo.

### 1.3. Configuración Global (`src/data/siteConfig.ts`)
En este archivo puedes controlar comportamientos que afectan a todo el sitio.
- **Estado de la Convocatoria**: Modifica la variable booleana `CONVOCATORIA_ABIERTA`. 
  - `true`: Habilita el formulario de inscripción y los botones "Postula aquí".
  - `false`: Deshabilita los accesos a los formularios y muestra el estado "Cerrado".

### 1.4. Preguntas Frecuentes (FAQ)
Las preguntas de la página de eventos se encuentran definidas en el componente `src/components/components-events/FAQEventos.astro`. Podrás editar los textos directamente en el arreglo de objetos ubicado al inicio de dicho archivo.

> [!WARNING]
> Siempre verifica que el proyecto compile sin errores (`npm run build` o `npm run dev`) después de editar los archivos `.ts` para evitar fallos de sintaxis en producción.

---

## 2. Panel de Administración (Convocatorias)

El panel de administración se encuentra en la ruta `/admin` y funciona como un dashboard seguro para la gestión de aspirantes a las convocatorias.

### 2.1. Acceso y Seguridad
El módulo de inicio de sesión (`/src/pages/api/admin-login.ts`) está protegido e integrado con Supabase.
- **Privilegios**: Requiere de credenciales de administrador (variables de entorno).
- **Protección**: Cuenta con un sistema interno de *Rate Limiting* (Lockout system) para bloquear intentos maliciosos de fuerza bruta y estrategias para mitigar *Timing Attacks*.

### 2.2. Uso del Dashboard
Una vez autenticado, el dashboard te permite:
- **Visualización Analítica**: Ver en formato de tabla todos los postulantes registrados en la convocatoria actual.
- **Filtrado y Búsqueda**: Buscar rápidamente perfiles específicos y filtrarlos según su estado o métricas relevantes.
- **Exportación de Datos**: Descargar un archivo CSV con toda la información (o un filtro aplicado) haciendo clic en el botón de exportación, ideal para que otras áreas evalúen a los candidatos.
