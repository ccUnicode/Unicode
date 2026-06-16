# Guía de Testing y Control de Calidad (QA)

Este documento detalla las estrategias, flujos de pruebas manuales y validaciones de seguridad obligatorias para garantizar la calidad y el cumplimiento del estándar técnico antes de cada versión en producción.

> [!IMPORTANT]
> **Nota de QA:** En la fase actual del desarrollo, el proyecto **no cuenta** con pruebas unitarias, de integración o de extremo a extremo (E2E) automatizadas configuradas en el entorno local (tales como Vitest o Cypress). Por ende, el aseguramiento de la calidad recae al 100% en la correcta ejecución de los planes de pruebas manuales, de rendimiento y de seguridad detallados en este documento antes de solicitar un merge a producción.

---

## 1. Pruebas Manuales (Formulario de Postulación)

El formulario de inscripción en `/call` es el componente de mayor interacción de la plataforma. Se deben validar los siguientes escenarios de prueba:

### 1.1. Pruebas Funcionales (Campos Obligatorios)
*   **Caso de Prueba**: Envío de formulario vacío.
    *   *Resultado esperado*: Los validadores nativos de HTML5 bloquean el envío y enfocan el primer campo obligatorio.
*   **Caso de Prueba**: Relleno de campos con formatos inválidos (ej. teléfono de 8 dígitos, correo sin `@`).
    *   *Resultado esperado*: Bloqueo visual e indicación del patrón requerido.

### 1.2. Pruebas de API y Respuestas
*   **Caso de Prueba**: Envío correcto de postulación.
    *   *Resultado esperado*: El botón cambia a estado de carga asíncrona ("Verificando..."), se muestra un aviso en verde neón de éxito y el modal se cierra automáticamente tras 2.5 segundos.
*   **Caso de Prueba**: Envío duplicado (mismo correo electrónico).
    *   *Resultado esperado*: La alerta muestra en color rojo neón el mensaje: `"Este correo electrónico ya ha sido registrado."`.

---

## 2. Pruebas del Panel de Administración (`/admin`)

*   **Autenticación**:
    *   *Caso de Prueba*: Acceso a `/admin` sin sesión.
        *   *Resultado esperado*: Se renderiza exclusivamente la pantalla de acceso con campo de contraseña.
    *   *Caso de Prueba*: Intento de fuerza bruta.
        *   *Resultado esperado*: Bloqueo inmediato del formulario de acceso según el número de intentos permitidos y duración de penalización configurados en el servidor (consulte [Backend - Rate Limiting](backend.md#3-rate-limiting-control-de-tasas)).
*   **Filtros y Paginación**:
    *   *Caso de Prueba*: Cambio de pestañas por área (`GTH`, `ACD`, `ID`, `RRPP`, `DCC`).
        *   *Resultado esperado*: Las pestañas activas cambian de color (fondo verde neón con letras negras). Se efectúa la llamada a la API y se listan únicamente los candidatos correspondientes.
*   **Exportar Reportes**:
    *   *Caso de Prueba*: Clic en el botón "Exportar Excel".
        *   *Resultado esperado*: Descarga automática del archivo en formato XLS con estilos y cabeceras estructuradas.

---

## 3. Pruebas de Seguridad (Vulnerabilidades)

*   **Stored XSS (Inyección de Script)**:
    *   *Acción*: Enviar una postulación con código JavaScript en el campo de motivos (`<script>alert('xss')</script>`).
    *   *Validación*: Acceder al panel de administración `/admin` y verificar que el texto se renderiza literalmente como texto plano (`&lt;script&gt;`) y no ejecuta ninguna alerta o script en el navegador.
*   **Exposición de API Keys**:
    *   *Acción*: Inspeccionar el bundle de producción compilado en la consola del desarrollador.
    *   *Validación*: Confirmar que la llave `SUPABASE_SERVICE_ROLE_KEY` o `ADMIN_PASSWORD` no estén incrustadas en el JavaScript del cliente (deben operar estrictamente en la capa del servidor).

---

## 4. Pruebas de Rendimiento (LCP & Web Performance)

Para dar cumplimiento a la Directiva de rendimiento, se debe auditar el rendimiento del sitio mediante Lighthouse o WebPageTest:

*   **Largest Contentful Paint (LCP)**: Debe ser menor a 2.5 segundos.
*   **Peso Total de la Página**: No debe exceder 2.5MB en la carga inicial de la Landing Page.
*   **Optimización de Activos**: Todas las imágenes del directorio `/public` y `/src/assets` deben estar comprimidas en formato **WebP** y no superar los 300KB por recurso de manera individual.
