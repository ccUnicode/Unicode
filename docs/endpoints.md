# Especificación de Endpoints (API)

Este documento contiene la especificación técnica de los endpoints de la API local de la plataforma, detallando métodos HTTP, cabeceras, parámetros, payloads de petición, códigos de estado HTTP y ejemplos de respuesta.

---

## 1. `POST /api/apply`

Registra la postulación de un candidato para el proceso de convocatoria actual.

*   **Autenticación**: Ninguna (Acceso público).
*   **Cabeceras Requeridas**:
    *   `Content-Type: application/json`
    *   `X-Requested-With: XMLHttpRequest` (Protección básica CSRF)
*   **Cuerpo de la Petición (JSON)**:
    ```json
    {
      "first_name": "string (obligatorio, máx. 150 caracteres)",
      "last_name": "string (obligatorio, máx. 150 caracteres)",
      "email": "string (obligatorio, formato correo electrónico, máx. 150 caracteres)",
      "phone": "string (obligatorio, exactamente 9 dígitos numéricos)",
      "university": "string (obligatorio, máx. 150 caracteres)",
      "career": "string (obligatorio, máx. 150 caracteres)",
      "university_semester": "string (obligatorio, ciclo académico: '1'-'10' o '0' para egresado)",
      "first_choice_area": "string (obligatorio, área: GTH|ACD|RRPP|DCC|ID)",
      "second_choice_area": "string (opcional, área: GTH|ACD|RRPP|DCC|ID)",
      "application_reason": "string (obligatorio, máx. 2000 caracteres)"
    }
    ```

### Respuestas:
*   **200 OK**: Registro exitoso.
    ```json
    {
      "message": "¡Inscripción recibida correctamente!"
    }
    ```
*   **400 Bad Request**: Datos obligatorios faltantes o con formato/longitud no válida.
    ```json
    {
      "error": "El formato del correo electrónico no es válido."
    }
    ```
*   **403 Forbidden**: Solicitud no iniciada desde el cliente oficial (falta cabecera CSRF).
    ```json
    {
      "error": "Solicitud no autorizada."
    }
    ```
*   **409 Conflict**: Candidato ya registrado (restricción por correo electrónico único).
    ```json
    {
      "error": "Este correo electrónico ya ha sido registrado."
    }
    ```
*   **429 Too Many Requests**: Límite de envíos excedido (máx. 3 por IP en 10 minutos).
    ```json
    {
      "error": "Has enviado demasiadas postulaciones. Intenta de nuevo en unos minutos."
    }
    ```

---

## 2. `POST /api/admin-login`

Autentica al administrador y genera una sesión sin estado.

*   **Autenticación**: Ninguna.
*   **Cabeceras Requeridas**: `Content-Type: application/json`
*   **Cuerpo de la Petición (JSON)**:
    ```json
    {
      "password": "string (obligatorio)"
    }
    ```

### Respuestas:
*   **200 OK**: Credencial correcta. Retorna el token firmado HMAC.
    ```json
    {
      "success": true,
      "token": "payloadBase64.firmaHexadecimal"
    }
    ```
*   **401 Unauthorized**: Contraseña incorrecta. Indica intentos restantes antes del bloqueo.
    ```json
    {
      "error": "Contraseña incorrecta.",
      "attemptsRemaining": 4
    }
    ```
*   **429 Too Many Requests**: Bloqueo activo tras 5 intentos fallidos (bloqueo por 15 minutos).
    ```json
    {
      "error": "Demasiados intentos fallidos. Cuenta bloqueada por 15 minutos.",
      "locked": true,
      "remainingSeconds": 900
    }
    ```

---

## 3. `POST /api/admin-logout`

Invalida la sesión activa en el cliente.

*   **Autenticación**: Requiere token de sesión (opcional en esta capa debido al diseño stateless).
*   **Respuesta**:
    ```json
    {
      "success": true
    }
    ```

---

## 4. `GET /api/admin-applicants`

Retorna la lista de postulantes registrados con opciones de filtrado y ordenamiento.

*   **Autenticación**: Requiere token de sesión en la cabecera.
*   **Cabeceras Requeridas**: `Authorization: Bearer <token>`
*   **Parámetros de Consulta (Query Params)**:
    *   `area` (GTH|ACD|RRPP|DCC|ID) - Filtra por área de interés.
    *   `option` (all|first|second) - Filtra por prioridad de opción seleccionada.
    *   `order` (recent|priority) - Criterio de ordenamiento (por fecha de registro o por prioridad de opción).

### Respuestas:
*   **200 OK**: Retorna el listado estructurado de postulantes.
    ```json
    {
      "data": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "first_name": "Pedro",
          "last_name": "Ramos",
          "email": "pedro.ramos@uni.pe",
          "phone": "987654321",
          "university": "UNI",
          "career": "Ingeniería de Sistemas",
          "university_semester": "6",
          "first_choice_area": "ID",
          "second_choice_area": "DCC",
          "application_reason": "Motivación para aprender desarrollo...",
          "created_at": "2026-06-14T21:30:00.000Z"
        }
      ],
      "total": 1
    }
    ```
*   **401 Unauthorized**: Token de sesión ausente, inválido o expirado.
    ```json
    {
      "error": "No autorizado. Inicia sesión nuevamente."
    }
    ```

---

## 5. CMS Unicode — Eventos (`/api/cms/events`)

Conjunto de endpoints SSR (`export const prerender = false`) para administrar el módulo de Eventos y Novedades (`public.cms_events`) con auditoría automática en `public.cms_audit_logs`.

### Autenticación y Matriz de Permisos
* **Autenticación:** Requiere sesión válida de Supabase Auth mediante cabecera `Authorization: Bearer <jwt>` (o cookie `cms-access-token` / `sb-access-token`) vinculada a un registro activo en `public.cms_user_permissions`.
* **Flujo editorial dual por rol y `area_scope`:**
  * `admin` (`ALL`): Acceso total en todas las áreas (`GET`, `POST`, `PATCH`, `/status`, `DELETE`).
  * `dcc` (`ALL`): Crea, edita, publica directamente (1 paso) y archiva en todas las áreas. No puede eliminar definitivamente (`DELETE`).
  * `director` (`<AREA>`): Crea, edita, publica directamente (1 paso), aprueba (`pending_review` → `published`), devuelve a borrador (`pending_review` → `draft`) y archiva únicamente dentro de su `area_scope`.
  * `delegate` (`<AREA>`): Crea y edita en `'draft'` o envía a revisión (`'pending_review'`) dentro de su `area_scope` (flujo 2 pasos). Recibe `403 Forbidden` si intenta publicar/archivar, editar eventos publicados/archivados o acceder a otra área.

---

### 5.1 `GET /api/cms/events`

Lista eventos paginados filtrando automáticamente por el `area_scope` del actor cuando su rol es `director` o `delegate`.

* **Parámetros de Consulta (Query Params):**
  * `status` (`draft | pending_review | published | archived`) — Opcional.
  * `category` (`Hackathon | Workshop | Charla | Competencia | Panel | Integración | Social | Clase | Summit`) — Opcional.
  * `area_scope` (`ALL | ID | ACD | GTH | RRPP | DCC | LGE | FIN`) — Opcional (para `director`/`delegate`, si difiere de su área retorna `403`).
  * `is_featured` (`true | false`) — Opcional.
  * `search` (`string`, máx. 120 caracteres) — Filtra por coincidencia parcial en `title`, `slug` o `speaker`.
  * `page` (`integer >= 1`, default `1`) y `pageSize` (`integer 1..100`, default `20`).
* **Respuesta `200 OK`:**
  ```json
  {
    "data": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "slug": "tech-day-2026",
        "title": "Tech Day",
        "summary": "IA, Data y Cloud en la industria",
        "description": "Jornada técnica con expertos en IA e infraestructura cloud.",
        "event_date": "2026-04-18T14:30:00.000Z",
        "end_date": "2026-04-18T18:00:00.000Z",
        "display_date": "18 Abr 2026",
        "time_range": "9:30 AM – 1:00 PM",
        "location": "Auditorio CTIC – UNI",
        "category": "Charla",
        "area_scope": "ALL",
        "speaker": "Arturo Ospina, Jhonatan Morgan",
        "speaker_image_url": "/mascota/mascota-unicode-fondo-individual.webp",
        "thumbnail_url": "/projects/thumbnails/techday-thumbnail.webp",
        "background_image_url": "/convocatoria-bg.webp",
        "external_url": "https://luma.com/mevizytu",
        "attendees_count": 60,
        "highlights": ["IA", "Data", "Cloud"],
        "is_featured": true,
        "status": "published",
        "created_by": "10000000-0000-4000-8000-000000000002",
        "reviewed_by": "10000000-0000-4000-8000-000000000002",
        "published_at": "2026-04-01T15:00:00.000Z",
        "created_at": "2026-04-01T15:00:00.000Z",
        "updated_at": "2026-04-01T15:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

---

### 5.2 `POST /api/cms/events`

Crea un nuevo evento y registra la acción `'create'` en `cms_audit_logs`. Si `slug` no se envía, se autogenera en formato `kebab-case` desde `title`.

* **Cabeceras Requeridas:** `Authorization: Bearer <jwt>`, `Content-Type: application/json`
* **Cuerpo de la Petición (JSON):**
  ```json
  {
    "title": "Workshop Astro + Supabase",
    "slug": "workshop-astro-supabase",
    "summary": "Construyendo SSR rápido con PostgreSQL RLS",
    "description": "Taller práctico dirigido a estudiantes interesados en desarrollo web moderno.",
    "event_date": "2026-12-10T18:00:00-05:00",
    "end_date": "2026-12-10T20:00:00-05:00",
    "display_date": "10 Dic 2026",
    "time_range": "6:00 PM – 8:00 PM",
    "location": "Laboratorio FIIS - UNI",
    "category": "Workshop",
    "area_scope": "ID",
    "speaker": "Equipo ID UNICODE",
    "thumbnail_url": "/events/workshop-astro.webp",
    "external_url": "https://lu.ma/unicode-astro",
    "attendees_count": 0,
    "highlights": ["Astro", "Supabase"],
    "is_featured": false,
    "status": "draft"
  }
  ```
* **Respuestas:**
  * `201 Created`: `{ "data": { ...eventoCreado } }`
  * `400 Bad Request`: Campos obligatorios faltantes, categoría o área inválida, `end_date < event_date` o URL insegura (`javascript:`, `data:`, `//...`).
  * `401 Unauthorized`: Token ausente, inválido o expirado.
  * `403 Forbidden`: El usuario intenta crear en otra área o un `delegate` intenta crear directamente en `published`/`archived`.
  * `409 Conflict`: El `slug` ya existe (`code: "duplicate_slug"`).

---

### 5.3 `GET /api/cms/events/:id`

Obtiene el detalle de un evento específico validando formato UUID y pertenencia a `area_scope`.

* **Respuestas:** `200 OK` (`{ "data": { ...evento } }`), `400 Bad Request` (`invalid_id`), `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

---

### 5.4 `PATCH /api/cms/events/:id`

Actualiza campos editables de un evento y registra `'update'` con `changed_fields` en `cms_audit_logs`. No admite cambiar `status` (usar `/status`).

* **Restricción para delegados:** Un `delegate` recibe `403 Forbidden` si el evento ya se encuentra en `'published'` o `'archived'`.
* **Respuestas:** `200 OK` (`{ "data": { ...eventoActualizado } }`), `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`.

---

### 5.5 `DELETE /api/cms/events/:id`

Elimina definitivamente un evento y deja traza en `cms_audit_logs` (`metadata.operation = "hard_delete"`). **Exclusivo para el rol `admin` (`area_scope = 'ALL'`).**

* **Respuestas:**
  * `200 OK`: `{ "deleted": true, "id": "550e8400-e29b-41d4-a716-446655440000" }`
  * `401 Unauthorized` | `403 Forbidden` | `404 Not Found`

---

### 5.6 `PATCH /api/cms/events/:id/status`

Ejecuta una transición del ciclo de vida editorial (`draft`, `pending_review`, `published`, `archived`) validando el flujo dual y registrando la acción (`submit_review`, `approve_publish`, `reject_to_draft`, `archive`, `restore`) en `cms_audit_logs`.

* **Cuerpo de la Petición (JSON):**
  ```json
  {
    "status": "published",
    "review_comment": "Aprobado por Dirección de ID."
  }
  ```
* **Respuestas:**
  * `200 OK`: `{ "data": { ...eventoActualizado } }` (asigna automáticamente `reviewed_by` y `published_at` al aprobar a `'published'`).
  * `400 Bad Request`: Estado destino inválido o igual al estado actual (`code: "invalid_transition"`).
  * `401 Unauthorized` | `403 Forbidden` | `404 Not Found`

