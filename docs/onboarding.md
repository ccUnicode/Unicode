# Guía de Onboarding para Nuevos Desarrolladores

Bienvenido al equipo de desarrollo web de **UNICODE**. Este documento contiene los pasos y lineamientos necesarios para configurar tu entorno de desarrollo, comprender el flujo de trabajo y realizar tus primeras contribuciones.

---

## 1. Configuración del Entorno Local

### Requisitos Previos:
*   **Node.js**: Versión LTS 20 o superior.
*   **Git**: Para el control de versiones.
*   **Editor**: Recomendamos Visual Studio Code con extensiones para Astro y Tailwind CSS.

### Paso 1: Clonar e Instalar
Clona el repositorio oficial e instala las dependencias de paquetes limpias:
```bash
git clone https://github.com/ccUnicode/Unicode.git
cd Unicode
npm install
```

### Paso 2: Variables de Entorno
Crea un archivo `.env` en la raíz de tu proyecto basándote en el archivo de ejemplo:
```bash
cp .env.example .env
```
Rellena las variables con los datos de desarrollo provistos por el líder técnico del área de I+D:
*   `PUBLIC_SUPABASE_URL`: URL del endpoint de Supabase.
*   `PUBLIC_SUPABASE_ANON_KEY`: Llave anónima pública.
*   `SUPABASE_SERVICE_ROLE_KEY`: Llave administrativa (no exponer en scripts cliente).
*   `ADMIN_PASSWORD`: Contraseña local del panel `/admin`.

---

## 2. Ejecución y Comandos Principales

Para el desarrollo del día a día, se utiliza el servidor local de desarrollo:

*   `npm run dev`: Levanta el servidor local de desarrollo con recarga rápida (*hot reload*) en `http://localhost:4321/`.

Para conocer los comandos utilizados para compilar, previsualizar y empaquetar la aplicación para entornos de producción, consulte:
*   [Guía de Despliegue - Comandos de Compilación](despliegue.md#2-requisitos-previos-y-comandos-de-compilacion)

---

## 3. Acceso Administrativo Local

Para validar el dashboard de administración y visualización de candidatos localmente:
1.  Asegúrate de tener la variable `ADMIN_PASSWORD` configurada en tu `.env`.
2.  Inicia el servidor local (`npm run dev`).
3.  Navega hacia `http://localhost:4321/admin`.
4.  Ingresa la contraseña especificada en tu archivo `.env`.

---

## 4. Guía de Contribución y Ramas

Para mantener una historia de Git limpia y ordenada:
1.  **Actualízate**: Antes de empezar a programar, sincroniza tu entorno local con la rama `main` en GitHub.
2.  **Crea tu rama**: Usa nombres descriptivos en minúsculas estructurados como `<tipo>/<descripcion-kebab>` (ej. `feat/areas` o `fix/error-login`).
3.  **Convención de Commits**: Realiza tus commits siguiendo el estándar de commits semánticos (`tipo(ámbito): descripción`).
    *   *Correcto*: `feat(home): agregar sección novedades`
    *   *Incorrecto*: `cambios en el index`
4.  **Cuidado de Calidad**: Asegúrate de que tu código no contenga comentarios de depuración (`console.log`) innecesarios ni conflictos pendientes antes de abrir un Pull Request (PR).
