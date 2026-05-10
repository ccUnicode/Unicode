# Guía de Contribución

¡Gracias por tu interés en contribuir a la Landing Page de Unicode! Como este es un proyecto mantenido por el equipo de I+D y cambia cada ciclo, tenemos normas estrictas para mantener el orden, la trazabilidad y la calidad del código.

## 1. Nomenclatura Global
- **Idioma del Código:** Todo el código fuente, variables, funciones, nombres de ramas y mensajes de commit deben escribirse estrictamente en **inglés**.
- **Idioma de la Documentación:** Toda la documentación técnica (archivos `.md`) se redacta en **español** de forma clara y directa.
- **Nomenclatura de Archivos:** Todos los archivos y carpetas deben nombrarse usando `kebab-case` (ej. `base-de-datos.md`, `docs/`, `boton-principal.tsx`). Las únicas excepciones aceptadas en mayúsculas son `README.md`, `CONTRIBUTING.md` y `CHANGELOG.md`.

## 2. Reglas de Git

Para asegurar que el historial del repositorio sea entendible, exigimos seguir el formato de ramas y de "Conventional Commits".

### Ramas (Branches)
El formato obligatorio para crear ramas es:
`tipo/descripcion-en-kebab-case`

Los **tipos permitidos** son:
- `feat/`: Para el desarrollo de nuevas características funcionales.
- `fix/`: Para la corrección de errores o bugs.
- `refactor/`: Para refactorización de código existente (no añade características ni corrige bugs).
- `docs/`: Para cambios exclusivos a la documentación (archivos `.md`).
- `test/`: Para adición o modificación de pruebas automáticas.
- `chore/`: Para tareas de mantenimiento, actualización de dependencias, configuración del build, etc.

*Ejemplos:*
- `feat/add-contact-form`
- `fix/header-mobile-layout`
- `docs/update-onboarding-guide`

### Commits
Los mensajes de commit deben seguir el estándar **Conventional Commits** en inglés, bajo la siguiente estructura:
`tipo(alcance): descripcion`

- **tipo**: Debe coincidir con el tipo usado en la rama (`feat`, `fix`, `refactor`, `docs`, `test`, `chore`).
- **alcance**: (Opcional) Indica el componente o archivo afectado, en minúsculas y sin espacios.
- **descripcion**: Un mensaje corto en imperativo, comenzando en minúscula y sin punto final.

*Ejemplos:*
- `feat(nav): add transparent background on scroll`
- `fix(auth): resolve login timeout issue`
- `docs: update deployment instructions`

## 3. Proceso de Pull Requests (PR)
1. Asegúrate de estar trabajando en una rama derivada de `main` (o la rama base activa de desarrollo).
2. Verifica que tu código compila correctamente localmente (`npm run build`).
3. Sube tus cambios a tu rama.
4. Abre el Pull Request en GitHub hacia `main`, describiendo los cambios de forma clara y detallando qué problema resuelve.
5. Espera la revisión de al menos un miembro del equipo antes de fusionar.
