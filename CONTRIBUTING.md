# Guía de Contribución - Centro Cultural Unicode

¡Bienvenido(a) al repositorio oficial del Centro Cultural Unicode! Agradecemos tu interés en contribuir a nuestra plataforma web.

Este documento establece los lineamientos de desarrollo, la estructura del proyecto y los procesos necesarios para trabajar de manera integrada en el equipo, basándose en la **Directiva ID 2026**.

---

## 1. Introducción y Propósito

La plataforma web de Unicode (Landing Page, Sistema de Convocatorias y Panel Administrativo) está construida con **Astro, TypeScript, Tailwind CSS y Supabase**. El propósito de esta guía es unificar el flujo de trabajo del equipo respetando la estructura actual y facilitando la colaboración rápida.

---

## 2. Flujo de Trabajo Git

Utilizamos un flujo de trabajo basado en **Feature Branches** (Ramas de Características). El proceso general es el siguiente:

1. **Clonar/Actualizar** el repositorio localmente a partir de `main`.
2. Crear una nueva rama para tu tarea.
3. Realizar los cambios (commits) en tu rama.
4. Sincronizar con `main` para resolver conflictos de forma temprana.
5. Subir la rama y abrir un **Pull Request (PR)** hacia `main`.
6. Obtener la revisión e integrar el PR.

---

## 3. Convención de Ramas

Los nombres de las ramas deben ser descriptivos, en minúsculas y usar guiones (`-`) para separar palabras. La estructura general es: `<tipo>/<descripcion-breve>`.

**Tipos permitidos:**
* `feat/`: Nueva funcionalidad (ej. `feat/home`, `feat/areas`, `feat/formulario-convocatoria`).
* `fix/`: Corrección de un error (ej. `fix/error-login-supabase`).
* `docs/`: Cambios exclusivos de documentación (ej. `docs/actualizar-readme`).
* `refactor/`: Cambios en código que no corrigen errores ni añaden funcionalidades (ej. `refactor/optimizar-consultas`).
* `test/`: Adición o modificación de pruebas.
* `chore/`: Tareas de mantenimiento o dependencias.

---

## 4. Convención de Commits

Buscamos seguir una convención clara basada en el tipo de cambio: `tipo(ámbito): descripción`.

**Ejemplos reales del proyecto:**
* `feat(home): implementar sección de novedades`
* `fix(docs): improve the file of arquitectura.md`
* `refactor(docs): changed the files in docs`
* `fix(call): Call is closed`

---

## 5. Estándares de Código (Astro y TypeScript)

* **TypeScript:** El proyecto extiende la configuración estricta de Astro (`astro/tsconfigs/strict`). No obstante, en la fase actual se permite el uso del tipo `any` en situaciones específicas como:
  * Parseo y validación de cuerpos de solicitudes en la API (ej. `parsedBody: any`).
  * Captura de errores en bloques try-catch (ej. `catch (err: any)`).
  * Filtrado y ordenamiento dinámico de datos de la base de datos.
* **Astro:** Separa la lógica del servidor (Frontmatter `---`) de la estructura HTML.
* **Tailwind CSS:** Utiliza las clases utilitarias de Tailwind. Evita crear CSS personalizado a menos que sea estrictamente necesario para animaciones complejas, respetando la identidad visual (Dark theme + Verde Neón).

---

## 6. Convenciones de Nomenclatura

* **Componentes (Astro, React, etc.):** `PascalCase`. Ejemplo: `area-card.astro`, `area-director-profile.astro`. (Confirmado en el uso real de componentes en `src/components`).
* **Organización de Componentes:** Los componentes se agrupan en subcarpetas dentro de `src/components` usando la convención `components-<tema>` (ej. `components-areas`, `components-home`, `components-events`).
* **Páginas y Rutas:** `kebab-case`. Se permiten tildes en nombres de archivos que definen rutas de áreas específicas del centro (ej. `academica.astro`, `direccion-de-comunicacion-y-contenido.astro`).
* **Variables y Funciones:** `camelCase`. Ejemplo: `obtenerPostulantes()`, `isModalOpen`, `setupMobileMenu`, `validarEmail`. (Confirmado en el código).
* **Constantes:** `UPPER_SNAKE_CASE`. Ejemplo: `MAX_POSTULACIONES`, `WINDOW_MS`. (Confirmado en el código).
* **Campos de Base de Datos y APIs:** `snake_case`. Los campos que interactúan directamente con la base de datos o endpoints usan esta nomenclatura (ej. `first_name`, `first_choice_area`). (Confirmado en el código).
* **Interfaces y Tipos:** `PascalCase` sin prefijos. Ejemplo: `Area`, `Project` (no `IArea`). (Confirmado en `types/index.ts`).

---

## 7. Comentarios y Documentación de Código

Requerimos colocar un bloque descriptivo `/** ... */` al inicio de los archivos principales de la API o del sistema para detallar su propósito, funcionamiento y medidas de seguridad aplicadas.

**Ejemplo real (POST /api/postular):**
```typescript
/**
 * API Endpoint: POST /api/postular
 * Endpoint para recibir postulaciones de la convocatoria.
 * 
 * Medidas de seguridad:
 * - Whitelist de campos (solo acepta campos permitidos)
 * - Validación de formatos (correo, teléfono, longitudes)
 * - Sanitización de strings (previene XSS almacenado)
 * - Rate limiting (máx 3 postulaciones por IP cada 10 min)
 * - Protección CSRF (valida header X-Requested-With)
 */
```

---

## 8. Actualización de Documentación

Si tu código introduce un cambio arquitectónico o requiere nuevas variables de entorno, asegúrate de actualizar el archivo `README.md` o la carpeta `docs/` en tu misma rama de trabajo.

---

## 9. Procedimiento para Pull Requests (PR)

1. Sube tu rama al repositorio remoto.
2. Abre el Pull Request hacia la rama `main`.
3. Completa el título del PR indicando la funcionalidad agregada (ej. `Merge pull request #115 from ccUnicode/feat/areas`).
4. Describe brevemente qué cambios incluye el PR y solicita la revisión de otro miembro del equipo técnico.

---

## 10. Checklist Obligatorio para PRs

Antes de solicitar la aprobación de tu PR, verifica que cumples con lo siguiente:

- [ ] Mi código sigue la estructura de carpetas establecida.
- [ ] He eliminado los `console.log()` que no aporten a la depuración de producción.
- [ ] La nueva funcionalidad ha sido probada de manera local.
- [ ] No hay conflictos pendientes con la rama `main`.

---

## 11. Buenas Prácticas de Revisión de Código (Code Review)

* **Empatía:** Los comentarios deben enfocarse en mejorar el código, no en criticar al autor.
* **Prueba:** Descarga la rama localmente para probar cambios complejos antes de dar el visto bueno.
* **Aprobación:** Si todo es correcto y funciona, aprueba el PR.

---

## 12. Manejo de Variables de Entorno y Seguridad

* **Seguridad:** El archivo `.env` está ignorado en `.gitignore` para no exponer credenciales reales.
* **Obtención de llaves:** Solicita las credenciales de desarrollo directamente al equipo administrador de base de datos / Supabase para poder interactuar localmente.

---

## 13. Proceso de Onboarding para Nuevos Colaboradores

Si te estás sumando al proyecto, sigue estos pasos:

1. Clona el proyecto: `git clone <url-del-repositorio>`
2. Instala dependencias locales: `npm install`
3. Crea tu archivo `.env` en la raíz del proyecto y solicita las claves de Supabase correspondientes.
4. Levanta el entorno de desarrollo: `npm run dev`
5. Accede a `http://localhost:4321` para ver el sitio localmente.

---

## 14. Herramientas de Calidad de Código

* **Editor de Código:** Se aconseja que cada desarrollador configure su editor de preferencia (como VS Code) para auto-formatear el código al guardar.
* *Nota:* En la fase actual del proyecto no se cuenta con scripts automatizados de linters o formateadores en el `package.json` (`eslint`/`prettier`), por lo que la revisión y cuidado de la calidad del código recae temporalmente en las pruebas locales y en el Code Review.

---
*Documento alineado a la Directiva ID 2026. Mantenido por el equipo técnico del Centro Cultural Unicode.*
