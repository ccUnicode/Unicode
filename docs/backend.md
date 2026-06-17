# Documentación del Backend

Este documento describe la arquitectura, la lógica de seguridad y el manejo de sesiones en la capa intermedia de backend de la plataforma oficial de UNICODE.

---

## 1. Arquitectura General (Serverless y SSR)

La capa de backend de la plataforma está implementada mediante **Astro API Routes** ejecutados en el servidor bajo demanda (SSR - Server-Side Rendering) a través de la directiva `export const prerender = false`.

El empaquetado y la ejecución del servidor se realizan sobre el entorno de **Vercel** utilizando funciones serverless. Esto significa que cada petición HTTP a los endpoints locales (`src/pages/api/*`) despierta un contenedor aislado de ejecución efímera, el cual procesa la solicitud, realiza la consulta correspondiente a Supabase y retorna la respuesta.

---

## 2. Gestión de Sesiones (Criptografía HMAC)

El acceso administrativo al panel de `/admin` está protegido por un sistema de sesión sin estado (*stateless*), lo cual es ideal para evitar lecturas constantes de base de datos en entornos serverless:

*   **Generación del Token**: Al ingresar la contraseña válida en `/api/admin-login`, el backend calcula una fecha de expiración (4 horas a futuro) y la codifica en Base64. A partir de esa cadena de Base64, utiliza la **Web Crypto API** nativa del runtime para firmar criptográficamente el token usando una clave secreta (`ADMIN_PASSWORD`) con el algoritmo de hash **HMAC-SHA-256**. El token retornado al cliente tiene la estructura: `PayloadBase64.FirmaHexadecimal`.
*   **Validación de Sesiones**: En cada consulta a `/api/admin-applicants`, el servidor intercepta la cabecera `Authorization: Bearer <token>`, extrae el payload y la firma, recalcula la firma HMAC con la clave del servidor y valida si coinciden. Si la firma es correcta y la fecha de expiración es válida, la petición es aprobada.

---

## 3. Rate Limiting (Control de Tasas)

Para mitigar intentos de intrusión y denegación de servicio, los endpoints críticos implementan controles de tasas:

*   **Formulario de Postulación (`/api/apply`)**: Limita a un máximo de 3 postulaciones exitosas por dirección IP en una ventana de 10 minutos.
*   **Inicio de Sesión (`/api/admin-login`)**: Limita a un máximo de 5 intentos fallidos por dirección IP en una ventana de 15 minutos, bloqueando automáticamente la IP por otros 15 minutos si se excede el límite.

### ⚠️ Limitación en Producción Serverless
Los limitadores de tasa actuales están implementados en memoria del servidor mediante una estructura `Map` de JavaScript (`loginAttempts` y `applicationAttempts`). 
Debido a que Vercel ejecuta las solicitudes de forma distribuida en múltiples contenedores serverless efímeros, la memoria RAM local **no se comparte** entre las instancias. Por lo tanto, un atacante distribuido podría evadir parcialmente el límite.

*   *Recomendación para Producción*: Para una protección de grado empresarial, se debe sustituir la estructura `Map` por un almacenamiento centralizado persistente de baja latencia como **Vercel KV (Redis)** o una tabla dedicada de auditoría en **Supabase**.

---

## 4. Medidas de Seguridad Clave

*   **Whitelisting (Campos Permitidos)**: El endpoint de postulación extrae de manera explícita únicamente las variables de datos permitidas, descartando cualquier campo inyectado en el cuerpo JSON por clientes maliciosos.
*   **Sanitización contra XSS**: Todos los campos de texto libre introducidos por el usuario son limpiados en el servidor a través de una función de sanitización que reemplaza los caracteres HTML reservados (`<`, `>`, `&`, `"`, `'`) por sus entidades equivalentes, mitigando ataques de XSS almacenado.
*   **CSRF Protection**: Las peticiones de mutación requieren la cabecera `X-Requested-With: XMLHttpRequest` para verificar que la petición procede del cliente web original y no de llamadas embebidas de terceros.
*   **Mitigación de Timing Attacks**: El validador de contraseñas `/api/admin-login` utiliza una función de comparación de cadenas en tiempo constante (`safeCompare`). Esto garantiza que el tiempo de ejecución de la validación sea uniforme independientemente de qué caracteres de la contraseña coincidan, evitando que un atacante deduzca la contraseña analizando las micro-latencias de respuesta del servidor.

---

## 5. Estructura Física y Contratos de la API

La lógica de backend y rutas API se encuentra centralizada en la ruta `/src/pages/api/` y se compone de los siguientes archivos:

*   **`admin-login.ts`**: Validador de contraseña y generador de firmas HMAC.
*   **`admin-logout.ts`**: Invalidador lógico de la cookie de sesión del administrador.
*   **`admin-applicants.ts`**: Recuperación filtrada y ordenada de datos de la base de datos de Supabase.
*   **`apply.ts`**: Validación rígida de campos, control de tasa (rate limit), sanitización y persistencia segura de candidatos.

Para conocer la estructura formal de los payloads JSON, parámetros de consulta y respuestas HTTP de estos endpoints, consulte:
*   [Especificación de Endpoints (API)](endpoints.md)
