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

---

## 6. Modelo de Control de Acceso del CMS (RBAC + Scope)

El sistema de gestión de contenidos (CMS) de UNICODE implementa un modelo híbrido de control de acceso que combina **Roles basados en permisos (RBAC)** con **Alcances territoriales o de área (ABAC / Scopes)**, complementado con el flag de capacidad de publicación directa (`can_publish`).

### 6.1 Decisiones Cerradas por Dirección

1. **Admin General / Presidencia (`scope = 'ALL'`, `can_publish = true`)**: Control total sobre todos los módulos, configuraciones y publicaciones de la plataforma.
2. **Editor Global DCC (`scope = 'ALL'`, `can_publish = true` o configurable)**: Administra y supervisa contenidos de todas las áreas de la organización.
3. **Director de Área (`scope = '<AREA>'`, `can_publish = true`)**: Edita y publica contenido en **1 solo paso** dentro de su área (ej. Gabriel en I&D publica directamente sin intermediarios).
4. **Delegado de Área (`scope = '<AREA>'`, `can_publish = false`)**: Redacta y edita en su área en modo borrador. Su flujo requiere **2 pasos**: crea borrador → lo envía a *En Revisión* → el Director de su área aprueba y publica.

### 6.2 Esquema DDL de `cms_user_permissions`

La asignación de permisos se centraliza en la tabla `public.cms_user_permissions`, vinculada a las cuentas autenticadas en Supabase Auth (`auth.users`):

```sql
-- Habilitación de tipos enumerados para roles y áreas del CMS
CREATE TYPE cms_role_type AS ENUM ('admin', 'editor_global', 'director', 'delegado');
CREATE TYPE unicode_area_type AS ENUM ('ALL', 'ID', 'RRPP', 'GTH', 'ACD', 'DCC', 'LGE', 'FIN');

-- Tabla central de permisos y asignaciones del CMS
CREATE TABLE IF NOT EXISTS public.cms_user_permissions (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL CHECK (email = lower(email) AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    role cms_role_type NOT NULL,
    area_scope unicode_area_type NOT NULL,
    can_publish BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Restricciones de integridad y coherencia de negocio
    CONSTRAINT check_admin_consistency CHECK (
        (role = 'admin' AND area_scope = 'ALL' AND can_publish = true) OR
        (role <> 'admin')
    ),
    CONSTRAINT check_editor_global_consistency CHECK (
        (role = 'editor_global' AND area_scope = 'ALL') OR
        (role <> 'editor_global')
    ),
    CONSTRAINT check_area_roles_scope CHECK (
        (role IN ('director', 'delegado') AND area_scope <> 'ALL') OR
        (role NOT IN ('director', 'delegado'))
    ),
    CONSTRAINT check_director_publish_capability CHECK (
        (role = 'director' AND can_publish = true) OR
        (role <> 'director')
    ),
    CONSTRAINT check_delegado_publish_restriction CHECK (
        (role = 'delegado' AND can_publish = false) OR
        (role <> 'delegado')
    )
);

-- Índices de consulta rápida para evaluación de RLS
CREATE INDEX IF NOT EXISTS idx_cms_user_permissions_lookup 
ON public.cms_user_permissions(user_id, area_scope, can_publish);

-- Habilitación estricta de Row Level Security
ALTER TABLE public.cms_user_permissions ENABLE ROW LEVEL SECURITY;
```

### 6.3 Articulación con `recruitment_directors`

El sistema de convocatorias ya cuenta con un registro maestro de directores en `public.recruitment_directors`:

```sql
-- Estructura existente en recruitment:
-- recruitment_directors(email text primary key, area text, name text, created_at timestamptz)
```

Para mantener consistencia institucional y evitar duplicidad de credenciales:
1. **Identificador Canónico**: El correo electrónico institucional (`email`) actúa como clave de enlace entre `recruitment_directors` y `auth.users` / `cms_user_permissions`.
2. **Sincronización y Mapeo Automático**:
   * Cuando un usuario registrado en `recruitment_directors` inicia sesión en la plataforma mediante Supabase Auth (correo o Magic Link/OTP), el sistema lo reconoce automáticamente como **Director de Área** con `area_scope = recruitment_directors.area` y `can_publish = true`.
   * Para asegurar sincronización atómica, se prevé una función trigger o sincronizador que, al crearse o actualizarse un usuario en `auth.users`, consulta `recruitment_directors` y provisiona o actualiza su registro en `cms_user_permissions`.
   * Si la dirección de un área cambia en `recruitment_directors`, el permiso del CMS se actualiza en cascada, revocando la capacidad de publicación al director saliente y otorgándola al entrante.

### 6.4 Matriz RBAC Definitiva

| Perfil | Rol (`role`) | Alcance (`area_scope`) | Publicación (`can_publish`) | Flujo de Publicación | Capacidades Operativas |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Admin General / Presidencia** | `admin` | `ALL` | `true` | **1 Paso** (Directo) | Control total de la plataforma: creación, edición, publicación y eliminación de contenidos en todas las áreas, gestión de usuarios y permisos. |
| **Editor Global DCC** | `editor_global` | `ALL` | `true` (o configurable) | **1 Paso** (Directo) | Supervisión y edición transversal de proyectos, eventos y noticias de cualquier área para control de calidad y línea gráfica editorial. |
| **Director de Área** | `director` | `<AREA>` (ej. `ID`) | `true` | **1 Paso** (Directo) | Autoridad máxima del área. Crea y publica directamente eventos y proyectos de su propia área. Aprueba y publica borradores enviados por Delegados. |
| **Delegado de Área** | `delegado` | `<AREA>` (ej. `ID`) | `false` | **2 Pasos** (Revisión) | Redacción y propuesta de contenidos. Solo puede crear y editar borradores (`draft`). Debe someterlos a estado `in_review` para que su Director los apruebe y publique. |

---

### 6.5 Funciones Helper SQL para Políticas RLS

Para desacoplar la lógica de permisos de las consultas directas y optimizar las políticas de seguridad a nivel de fila (RLS), se diseñan dos funciones con `SECURITY DEFINER`:

```sql
-- 1. Evalúa si el usuario autenticado tiene acceso de lectura o edición al área solicitada
CREATE OR REPLACE FUNCTION public.has_area_access(target_area unicode_area_type)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    user_perm RECORD;
BEGIN
    -- Si no está autenticado, no tiene acceso
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;

    -- Obtener la asignación del usuario
    SELECT role, area_scope INTO user_perm
    FROM public.cms_user_permissions
    WHERE user_id = auth.uid();

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Admin y Editor Global tienen alcance universal
    IF user_perm.area_scope = 'ALL' THEN
        RETURN true;
    END IF;

    -- Director y Delegado solo acceden a su área correspondiente
    RETURN user_perm.area_scope = target_area;
END;
$$;

-- 2. Evalúa si el usuario autenticado puede publicar directamente contenido del área
CREATE OR REPLACE FUNCTION public.can_publish_content(target_area unicode_area_type)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    user_perm RECORD;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;

    SELECT role, area_scope, can_publish INTO user_perm
    FROM public.cms_user_permissions
    WHERE user_id = auth.uid();

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Requiere coincidencia de área (o ALL) Y bandera de publicación activa
    IF (user_perm.area_scope = 'ALL' OR user_perm.area_scope = target_area) AND user_perm.can_publish = true THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$;

-- Revocación de permisos públicos y asignación exclusiva a roles autorizados
REVOKE ALL ON FUNCTION public.has_area_access(unicode_area_type) FROM public;
REVOKE ALL ON FUNCTION public.can_publish_content(unicode_area_type) FROM public;
GRANT EXECUTE ON FUNCTION public.has_area_access(unicode_area_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_publish_content(unicode_area_type) TO authenticated;
```

#### Aplicación de las Helpers en Tablas del CMS (Ejemplo conceptual RLS):
* **`INSERT / UPDATE` en estado `draft` o `pending_review`**: Permitido si `has_area_access(area)`.
* **`UPDATE` pasando a `status = 'published'` o `DELETE`**: Permitido únicamente si `can_publish_content(area)`.

---

## 7. Especificación de Supabase Storage (Buckets y Políticas)

Para garantizar la integridad visual, el rendimiento (LCP < 2.5s) y la seguridad de los archivos multimedia subidos desde el CMS, se define la siguiente arquitectura de almacenamiento en **Supabase Storage**.

### 7.1 Catálogo de Buckets

| Nombre del Bucket | Visibilidad | Propósito / Contenido | Formatos MIME Permitidos | Límite por Archivo |
| :--- | :---: | :--- | :--- | :---: |
| **`events-media`** | Público (`public`) | Banners de cabecera, afiches promocionales y galerías de fotos de eventos realizados. | `image/webp`, `image/png` | 5 MB |
| **`projects-media`** | Público (`public`) | Capturas de pantalla, mockups y carátulas de proyectos de software e investigación. | `image/webp`, `image/png` | 5 MB |
| **`alliances-logos`** | Público (`public`) | Logotipos e isotipos vectoriales o rasterizados de empresas aliadas y convenios. | `image/webp`, `image/png` | 2 MB |
| **`institutional-media`** | Público (`public`) | Identidad visual de UNICODE, manuales de marca, fotografías de directiva y recursos institucionales transversales. | `image/webp`, `image/png` | 5 MB |

> [!IMPORTANT]
> **Optimización de Formatos**: Se prioriza estrictamente el formato `.webp` por su alta eficiencia de compresión sin pérdida perceptible de calidad, alineado a las metas de Core Web Vitals. El formato `.png` se admite para logos y elementos gráficos con fondo transparente o diagramas técnicos.

### 7.2 Reglas y Políticas de Seguridad en Storage (`storage.objects`)

Los buckets están configurados con acceso de lectura pública (para ser consumidos directamente por la landing y el frontend), pero las operaciones de mutación (`INSERT`, `UPDATE`, `DELETE`) están estrictamente restringidas a usuarios autenticados con permisos válidos en el CMS:

1. **Lectura (`SELECT`)**:
   * Permitida para roles `anon` y `authenticated` de forma global, permitiendo la entrega rápida mediante la CDN de Supabase.
2. **Subida / Inserción (`INSERT`)**:
   * Solo para usuarios autenticados que cumplan con `has_area_access(area)` o pertenezcan a `admin`/`editor_global`.
   * Los archivos deben validar la lista blanca de MIME types (`image/webp`, `image/png`).
3. **Modificación y Eliminación (`UPDATE`, `DELETE`)**:
   * Solo permitida para usuarios que tengan permisos de publicación (`can_publish_content(area)`) o rol de `admin`. Previene la eliminación accidental o no autorizada de activos multimedia en producción.

---

## 8. Políticas de Seguridad RLS en SQL para Flujos de Contenido (1 Paso y 2 Pasos)

Esta sección define la especificación técnica declarativa de las políticas de **Row Level Security (RLS)** que gobiernan el ciclo de vida del contenido (`cms_events`, `cms_projects`, etc.) en Supabase, garantizando que el flujo de aprobación opere estrictamente a nivel de base de datos sin depender de validaciones en el cliente.

### 8.1 Ciclo de Vida del Contenido y Estados

El contenido gestionado por el CMS atraviesa una máquina de estados controlada mediante el tipo enumerado `cms_content_status_type`:

```sql
CREATE TYPE cms_content_status_type AS ENUM ('draft', 'pending_review', 'published', 'archived');
```

*   **`draft` (Borrador)**: Contenido en creación o edición preliminar. Solo visible por miembros autorizados del área.
*   **`pending_review` (En Revisión)**: Contenido remitido por un Delegado de Área a la espera de validación y aprobación por su Director.
*   **`published` (Publicado)**: Contenido aprobado, activo e indexable públicamente en la landing page y módulos del portal.
*   **`archived` (Archivado)**: Contenido histórico retirado de la vista pública sin ser eliminado físicamente.

---

### 8.2 Matriz de Transiciones y Privilegios por Perfil

| Estado Inicial | Acción Intentada | Estado Destino | Delegado de Área (`can_publish = false`) | Director de Área / DCC (`can_publish = true`) |
| :--- | :--- | :--- | :---: | :---: |
| *(Nuevo)* | Creación directa | `draft` | ✅ Permitido | ✅ Permitido |
| *(Nuevo)* | Creación y envío a revisión | `pending_review` | ✅ Permitido | ✅ Permitido |
| *(Nuevo)* | Publicación directa | `published` | ❌ **Denegado** (Flujo 2 pasos) | ✅ **Permitido** (Flujo 1 paso) |
| `draft` | Edición de borrador | `draft` | ✅ Permitido | ✅ Permitido |
| `draft` | Solicitar aprobación | `pending_review` | ✅ Permitido | ✅ Permitido |
| `draft` | Publicar directo | `published` | ❌ **Denegado** | ✅ **Permitido** |
| `pending_review` | Correcciones | `draft` / `pending_review` | ✅ Permitido | ✅ Permitido |
| `pending_review` | Aprobación final | `published` | ❌ **Denegado** | ✅ **Permitido** |
| `published` | Modificación de datos | `published` | ❌ **Denegado (Regla de Protección)** | ✅ **Permitido** |
| `published` | Solicitar cambio/revisión | `pending_review` | ✅ **Permitido (Retorno a Revisión)** | ✅ **Permitido** |
| Cualquiera | Eliminación física | *(Borrado)* | ❌ **Denegado** | ✅ **Permitido** |

---

### 8.3 Scripts DDL de Políticas RLS por Operación

A continuación se presentan las políticas RLS parametrizadas aplicadas sobre una tabla de contenidos canónica (ej. `public.cms_events` o `public.cms_projects` con columnas `id`, `area unicode_area_type`, `status cms_content_status_type`, `created_by uuid`, etc.):

```sql
-- Habilitación mandataria de Row Level Security en la tabla de contenidos
ALTER TABLE public.cms_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 1. POLÍTICA DE LECTURA (SELECT)
-- ============================================================================
-- Regla:
-- - Usuarios anónimos (landing pública): Solo leen contenido publicado ('published').
-- - Usuarios autenticados con rol de CMS:
--     * Admin General y Editor Global DCC ven todo ('ALL').
--     * Directores y Delegados ven borradores ('draft') y revisiones ('pending_review')
--       de su propia área, además de todo lo publicado ('published') institucionalmente.
-- ============================================================================
CREATE POLICY "cms_content_select_policy"
ON public.cms_events
FOR SELECT
TO public
USING (
    status = 'published'
    OR (
        auth.uid() IS NOT NULL 
        AND public.has_area_access(area)
    )
);

-- ============================================================================
-- 2. POLÍTICA DE CREACIÓN (INSERT)
-- ============================================================================
-- Regla:
-- - Requiere pertenencia/acceso al área correspondiente: has_area_access(area).
-- - Directores de Área, DCC y Admins (can_publish = true):
--     Pueden insertar directamente en cualquier estado ('draft', 'pending_review', 'published').
-- - Delegados de Área (can_publish = false):
--     Solo pueden insertar registros en 'draft' o 'pending_review'. Se rechaza 'published'.
-- ============================================================================
CREATE POLICY "cms_content_insert_policy"
ON public.cms_events
FOR INSERT
TO authenticated
WITH CHECK (
    public.has_area_access(area)
    AND (
        public.can_publish_content(area)
        OR (status IN ('draft', 'pending_review'))
    )
);

-- ============================================================================
-- 3. POLÍTICA DE ACTUALIZACIÓN (UPDATE)
-- ============================================================================
-- Regla:
-- - Requiere acceso al área correspondiente: has_area_access(area).
-- - Directores de Área, DCC y Admins (can_publish = true):
--     Pueden editar registros en cualquier estado y transicionar libremente hacia 'published'.
-- - Delegados de Área (can_publish = false):
--     * USING: Solo acceden a modificar registros si:
--         a) El registro actual está en 'draft' o 'pending_review'.
--         b) O el registro está en 'published', pero ÚNICAMENTE si la actualización
--            lo regresa a revisión ('pending_review').
--     * WITH CHECK: El estado final del registro NUNCA puede ser 'published';
--       debe quedar exclusivamente en 'draft' o 'pending_review'.
-- ============================================================================
CREATE POLICY "cms_content_update_policy"
ON public.cms_events
FOR UPDATE
TO authenticated
USING (
    public.has_area_access(area)
    AND (
        public.can_publish_content(area)
        -- Si es Delegado, puede seleccionar para edición registros en borrador/revisión,
        -- o registros publicados siempre y cuando la transacción los regrese a revisión.
        OR status IN ('draft', 'pending_review', 'published')
    )
)
WITH CHECK (
    public.has_area_access(area)
    AND (
        -- Usuarios con permiso de publicación pueden guardar en cualquier estado
        public.can_publish_content(area)
        -- Delegados tienen estrictamente prohibido guardar como 'published'.
        -- Si modifican un registro previamente 'published', están obligados a marcarlo
        -- como 'pending_review' (o 'draft'), retirándolo de la vista pública hasta aprobación.
        OR (status IN ('draft', 'pending_review'))
    )
);

-- ============================================================================
-- 4. POLÍTICA DE ELIMINACIÓN (DELETE)
-- ============================================================================
-- Regla:
-- - La eliminación de registros es una operación restringida de alto impacto.
-- - Se reserva exclusivamente a usuarios con facultad de publicación (can_publish = true)
--   en su área (Directores) o globalmente (Admin / Editor Global DCC).
-- - Los Delegados de Área NO tienen privilegios de DELETE; cualquier descarte debe
--   ser ejecutado o autorizado por el Director del área.
-- ============================================================================
CREATE POLICY "cms_content_delete_policy"
ON public.cms_events
FOR DELETE
TO authenticated
USING (
    public.can_publish_content(area)
);
```

---

### 8.4 Regla de Protección contra Modificación Directa de Contenido Publicado

Para cumplir con el requerimiento de negocio y salvaguardar la integridad de la landing pública frente a ediciones no supervisadas:

1. **Garantía mediante RLS (`WITH CHECK`)**:
   * Cuando un Delegado de Área ejecuta una sentencia `UPDATE` sobre un registro que se encuentra en `status = 'published'`, la cláusula `WITH CHECK` evalúa si el nuevo estado cumple `status IN ('draft', 'pending_review')`.
   * Si el Delegado intenta modificar el título, fecha, descripción o imágenes de un registro manteniendo `status = 'published'`, la política de seguridad RLS bloquea inmediatamente la transacción (`new row violates row-level security policy`).
   * Para que la mutación sea aprobada por PostgreSQL, el Delegado debe explícitamente enviar `status: 'pending_review'`. Al hacerlo:
     * El contenido publicado deja de ser visible al público general (`SELECT` público filtra exclusivamente `status = 'published'`).
     * El cambio queda en cola de espera de revisión para que el Director de Área o DCC audite las modificaciones y ejecute la publicación final.

2. **Trigger Opcional de Auditoría de Transiciones (`enforce_cms_status_transition`)**:
   Como capa adicional de defensa en profundidad (*defense-in-depth*), se define un trigger que valida y registra la transición de estados antes de cualquier mutación:

```sql
CREATE OR REPLACE FUNCTION public.check_cms_content_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_publisher BOOLEAN;
BEGIN
    -- Validar si el usuario en sesión es publicador para el área de la fila
    is_publisher := public.can_publish_content(OLD.area);

    -- Si no es publicador e intenta alterar una fila publicada manteniéndola en 'published'
    IF NOT is_publisher AND OLD.status = 'published' AND NEW.status = 'published' THEN
        RAISE EXCEPTION 'Operación denegada: Un Delegado no puede modificar directamente contenido publicado sin regresarlo a estado pending_review.';
    END IF;

    -- Si no es publicador e intenta elevar el estado a 'published'
    IF NOT is_publisher AND NEW.status = 'published' THEN
        RAISE EXCEPTION 'Operación denegada: No cuentas con permisos de publicación para el área %.', OLD.area;
    END IF;

    -- Actualizar timestamp de auditoría
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_cms_content_transition
BEFORE UPDATE ON public.cms_events
FOR EACH ROW
EXECUTE FUNCTION public.check_cms_content_transition();
```
