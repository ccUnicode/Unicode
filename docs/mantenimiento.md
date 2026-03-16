# Guía de Mantenimiento de Contenidos

Esta guía explica cómo mantener actualizada la información del sitio sin necesidad de tocar componentes de UI complejos.

## 1. Proyectos
Todos los proyectos se gestionan en `src/data/projects.ts`.

- **Agregar un proyecto**: Duplica un objeto existente en el array `projects`.
- **Destacar un proyecto**: Asegúrate de que el proyecto tenga la propiedad `category: "Destacado"`. Esto lo hará aparecer en la sección "Proyectos Destacados".
- **Estado**: Usa `status: "Activo"` o `"Inactivo"`.
- **Equipo**: Si un miembro no tiene foto, deja la propiedad `image: ""`. El sistema mostrará automáticamente un avatar de silueta.

## 2. Eventos
Los eventos se gestionan en `src/data/events.ts`.

- **Próximos Eventos**: Se encuentran en el array `proximosEventos`. Solo se muestra el primero por diseño.
- **Eventos Realizados (Historial)**: Se encuentran en el array `eventosRealizados`. El sistema calcula automáticamente las estadísticas (total de asistentes, categorías, etc.).

## 3. Configuración del Sitio
En `src/data/siteConfig.ts` puedes controlar comportamientos globales.

- **Convocatoria**: Cambia `CONVOCATORIA_ABIERTA` a `true` o `false` para habilitar/deshabilitar el formulario de inscripción y el botón "Postula aquí".

## 4. Preguntas Frecuentes (FAQ)
Si necesitas editar las preguntas de la página de eventos, busca el componente `src/components/components-events/FAQEventos.astro`. Los datos están en un array de objetos al inicio del archivo.

---
**Nota para desarrolladores**: Siempre verifica que el archivo compile sin errores de sintaxis en el terminal después de editar los archivos `.ts`.
