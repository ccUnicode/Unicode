# Guía de Despliegue

## 1. Ambientes de ejecución

El ciclo de vida del proyecto está estructurado sobre los siguientes entornos de ejecución:

* **Entorno de Desarrollo (Local):** Ejecutado en la máquina local de cada desarrollador. Se utiliza para la codificación, depuración e integración de componentes.
* **Entorno de Producción (Live):** El sitio web público y funcional de Unicode. Está alojado en la plataforma cloud de **Vercel** como proveedor predeterminado y sincronizado directamente con la rama `main` del repositorio de GitHub.

---

## 2. Requisitos previos y comandos de compilación

Para compilar y empaquetar el proyecto de manera óptima para producción, se requiere contar con Node.js LTS en su versión 20 o superior.

### Comandos de ejecución:

* **Instalación de dependencias limpias (recomendado para entornos CI/CD):**
  ```bash
  npm ci
  ```
* **Compilación de la aplicación para producción (genera la carpeta `dist/`):**
  ```bash
  npm run build
  ```
* **Previsualización local del build estático de producción:**
  ```bash
  npm run preview
  ```

---

## 3. Configuración de Variables de Entorno en el Hosting

Para que la Landing Page y el módulo de Convocatoria funcionen correctamente, es necesario configurar de forma segura las credenciales de Supabase en el panel de control del proveedor de hosting (Vercel):

### Variables requeridas (deben configurarse en Project Settings > Environment Variables):

* `PUBLIC_SUPABASE_URL`: Endpoint seguro del API REST de tu instancia en Supabase.
* `PUBLIC_SUPABASE_ANON_KEY`: Llave pública anónima de cliente para permitir la conexión desde el frontend.
* `SUPABASE_SERVICE_ROLE_KEY`: Llave administrativa secreta utilizada exclusivamente por las funciones de backend (`/api/postular` y `/api/admin-postulantes`).
* `ADMIN_PASSWORD`: Contraseña para el acceso al panel de administración de `/admin`.

> [!WARNING]
> Nunca se debe incluir el archivo `.env` local en los commits de Git. Verifica que el archivo `.env` esté correctamente listado en el archivo `.gitignore` en la raíz del proyecto para evitar la filtración accidental de llaves de API.

---

## 4. Proceso de Despliegue (Git-Ops / CD)

El despliegue está automatizado bajo una estrategia de Git-Ops mediante integración y entrega continua (CI/CD):

1. **Pull Requests (Preview Deployments):** Cualquier rama o Pull Request (PR) abierto y dirigido hacia la rama `main` dispara automáticamente la creación de un entorno de previsualización único generado por Vercel. Esto permite validar los cambios en vivo antes de integrarlos.
2. **Merge a Main (Production Deployments):** Cuando el Pull Request se aprueba y se integra (*merge*) a la rama `main`, Vercel ejecuta de forma automática el comando de compilación definitivo y actualiza el sitio en producción global en pocos segundos.

---

## 5. Procedimiento de Rollback (Reversión)

En caso de que un cambio aprobado en producción rompa alguna sección de la landing page o el formulario de convocatoria, existen dos flujos de reversión inmediata:

### Flujo Rápido (Panel del Hosting)
1. Inicia sesión en el panel de administración de **Vercel**.
2. Ve a la pestaña **Deployments** de tu proyecto.
3. Identifica el último despliegue estable (previo al error).
4. Selecciona el despliegue, haz clic en los tres puntos de opciones y selecciona **Promote to Production** (o **Rollback**). El tráfico web se redirigirá instantáneamente al build estable seleccionado.

### Flujo Alternativo (Git local)
Si el error requiere ser revertido de manera persistente en la historia de Git:
1. Revierte el commit defectuoso en local:
   ```bash
   git revert <commit_hash>
   ```
2. Crea el commit correspondiente:
   ```bash
   git commit -m "fix: revert previous breaking deployment"
   ```
3. Empuja los cambios a la rama principal:
   ```bash
   git push origin main
   ```
   *(Este comando disparará un nuevo despliegue automático limpio en Vercel).*

---

## 6. Checklist previo al despliegue

Todo desarrollador del equipo debe validar la siguiente lista de verificación de forma obligatoria antes de confirmar un merge que se despliegue a producción:

- [ ] Las validaciones del formulario de Convocatoria han sido probadas en local y no generan errores de consola.
- [ ] Se han configurado y verificado las variables de entorno de Supabase en la plataforma de hosting para el entorno de producción.
- [ ] El comando `npm run build` compila localmente de forma exitosa y sin advertencias críticas de linter.
- [ ] Todos los activos visuales (imágenes, logos de Unicode) se cargan correctamente y tienen rutas relativas válidas.
- [ ] Se han verificado las políticas de seguridad de Supabase (RLS) para asegurar que la tabla `applicants` en producción tiene permisos de escritura pero no de lectura pública para la anon key.
