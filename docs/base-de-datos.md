# Base de Datos

## 1. Tecnologías y Configuración

El motor de persistencia para la landing page de Unicode utiliza una base de datos **PostgreSQL** administrada a través de la plataforma de backend como servicio **Supabase**.

La interacción y la ingesta de datos desde el cliente frontend se realizan de manera segura a través de la API REST nativa utilizando dos variables de entorno de acceso público:
* `SUPABASE_URL`: Endpoint seguro del API REST del proyecto.
* `SUPABASE_ANON_KEY`: Llave anónima pública del cliente para el control básico de acceso.

El acceso directo de lectura y escritura no autorizada a las tablas está restringido mediante **Políticas de Seguridad a Nivel de Fila (RLS - Row Level Security)**. La política de la base de datos permite exclusivamente operaciones de inserción (`INSERT`) originadas desde el cliente de la landing page para registrar postulaciones, manteniendo bloqueadas las operaciones de selección (`SELECT`), actualización (`UPDATE`) y eliminación (`DELETE`) para proteger datos sensibles de accesos no autorizados.

---

## 2. Modelo de Datos (Tabla: applicants)

Estructura física de la tabla `applicants` utilizada para consolidar las postulaciones de la convocatoria:

| Columna | Tipo de dato | Restricciones (Constraints) | Descripción (Propósito) |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Primary Key, `default uuid_generate_v4()` | Identificador único global autogenerado para cada postulación. |
| `first_name` | `varchar(150)` | Not Null | Nombre o nombres del postulante. |
| `last_name` | `varchar(150)` | Not Null | Apellido o apellidos del postulante. |
| `email` | `varchar(150)` | Unique, Not Null | Correo electrónico de contacto único de cada postulante. |
| `phone` | `varchar(20)` | Not Null | Teléfono móvil o fijo de contacto del postulante. |
| `career` | `varchar(150)` | Not Null | Escuela profesional o carrera universitaria en curso. |
| `first_choice_area` | `varchar(150)` | Not Null, Check (IN ('ID', 'RRPP', 'GTH', 'ACD', 'DCC')) | Primera opción de área de postulación dentro de la organización. |
| `university` | `varchar(150)` | Not Null | Universidad de origen del postulante. |
| `university_semester` | `varchar(20)` | Not Null | Semestre o ciclo académico actual del postulante. |
| `application_reason` | `text` | Not Null | Motivos de postulación detallados para el ingreso a la organización. |
| `second_choice_area` | `varchar(150)` | Nullable, Check (NULL or IN ('ID', 'RRPP', 'GTH', 'ACD', 'DCC')) | Segunda opción opcional de área de postulación dentro de la organización. |
| `created_at` | `timestamptz` | Default: `now()` | Fecha y hora exacta en la que se realizó el registro en el sistema. |

---

## 3. Restricciones e Integridad de Datos (Constraints & Indexes)

* **Restricción de Unicidad (`UNIQUE`):** Implementada en la columna `email` para garantizar la integridad lógica del proceso de admisión, previniendo que un mismo correo electrónico pueda registrar múltiples postulaciones dentro de la misma base de datos.
* **Restricción de Verificación (`CHECK`):** Las columnas `first_choice_area` y `second_choice_area` están sujetas a una restricción de validación estricta a nivel de base de datos para asegurar que únicamente contengan las siglas válidas de las áreas autorizadas de la organización: `'GTH'` (Gestión de Talento Humano), `'ACD'` (Académica), `'RRPP'` (Relaciones Públicas), `'DCC'` (Dirección de Creación y Contenido) e `'ID'` (Investigación y Desarrollo).
* **Integración con Frontend:** Estas restricciones a nivel de esquema actúan como la última línea de defensa de la integridad de los datos. En el frontend, el formulario de la landing valida la estructura del payload (formatos de correo, caracteres permitidos, obligatoriedad y límites de caracteres) de manera equivalente antes del envío, garantizando una experiencia de usuario consistente y un flujo de datos limpio.

---

## 4. Sentencias de Creación (DDL SQL)

Sentencia DDL SQL declarativa completa para inicializar la tabla con sus respectivas restricciones de validación e integridad:

```sql
-- Create applicants table for landing page registrations
CREATE TABLE applicants (
    -- Unique identifier using uuid
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Personal details
    first_name VARCHAR(150) NOT NULL,
    last_name VARCHAR(150) NOT NULL,
    
    -- Contact details
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    
    -- Academic info
    career VARCHAR(150) NOT NULL,
    university VARCHAR(150) NOT NULL,
    university_semester VARCHAR(20) NOT NULL,
    
    -- Application options constrained to valid areas
    first_choice_area VARCHAR(150) NOT NULL CHECK (first_choice_area IN ('ID', 'RRPP', 'GTH', 'ACD', 'DCC')),
    second_choice_area VARCHAR(150) NULL CHECK (second_choice_area IS NULL OR second_choice_area IN ('ID', 'RRPP', 'GTH', 'ACD', 'DCC')),
    
    -- Text area for statement of purpose
    application_reason TEXT NOT NULL,
    
    -- Auto-generated timestamp
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Performance Indexes
CREATE INDEX idx_applicants_choices ON applicants(first_choice_area, second_choice_area);
CREATE INDEX idx_applicants_created_at ON applicants(created_at DESC);
```

---

## 5. Gestión de Migraciones y Semillas (Seeds)

En la fase actual del desarrollo, la definición de la estructura física de la base de datos se almacena en el archivo declarativo [schema.sql](../../supabase/schema.sql) ubicado en el directorio `/supabase/` en la raíz.

### Pasos para replicar el esquema en un nuevo proyecto de Supabase:
1. **Acceso al Dashboard**: Inicie sesión en el panel de control de **Supabase** y navegue hacia el proyecto correspondiente.
2. **Editor de SQL**: En la barra lateral izquierda, seleccione la herramienta **SQL Editor**.
3. **Cargar Estructura**: Cree una nueva consulta (*New Query*), copie la totalidad del contenido del archivo `supabase/schema.sql` y péguelo en el editor SQL.
4. **Ejecución**: Presione el botón **Run** para crear la tabla `applicants` con sus respectivas restricciones de validación y los índices de rendimiento optimizados.
5. **Configuración RLS**: Asegúrese de ir a la sección **Database > Policies** en Supabase para habilitar las políticas de seguridad a nivel de fila (*Row Level Security*), configurando permisos exclusivos de `INSERT` para roles públicos y restringiendo lecturas a la capa del servidor.

> **Módulo CMS Unicode (`cms_*`):** El esquema DDL ejecutable del CMS (Entregas 1 y 2) se encuentra versionado en [20261122_cms_core.sql](../supabase/migrations/20261122_cms_core.sql) y sus datos semilla exclusivos para desarrollo en [seed_cms_dev.sql](../supabase/seed_cms_dev.sql), sin alterar `applicants` ni las tablas `recruitment_*`.

---

# Módulo CMS Unicode — Entrega 1 (Eventos y Convocatoria)

> **Referencia de diseño:** Issue **CMS-1** (`[Doc & BD] Especificación del Modelo Entidad-Relación (cms_*) y Articulación con recruitment_config`).

## 6. Decisiones de Arquitectura y Flujo Editorial Dual

En el proyecto de Supabase en producción coexisten la tabla histórica de postulantes (`applicants` / `postulantes`) y las tablas operativas del sistema de reclutamiento (`recruitment_*`, creadas en `supabase/migrations/20261002_recruitment.sql` y migraciones posteriores). Para incorporar **CMS Unicode** dentro del mismo monorepo sin colisiones ni regresiones sobre el flujo activo de `/call` y `/postular`, aplican las siguientes reglas cerradas:

1. **Aislamiento nominal con prefijo `cms_`:** Toda entidad nueva del CMS emplea el prefijo `cms_` (`cms_events`, `cms_audit_logs`, `cms_user_permissions`) y el tipo enumerado `cms_content_status`.
2. **Reutilización sin duplicación en Convocatoria:** No se crea una tabla paralela `call_settings`. La configuración pública y operativa de `/call` continúa persistida en el registro singleton `public.recruitment_config` (`settings jsonb`, `revision int4`, `updated_at timestamptz`), auditada en `public.recruitment_config_events`.
3. **Ciclo de vida editorial en 4 estados (`cms_content_status`):**
   - `draft`: Borrador en edición (visible solo para el equipo autorizado del área y DCC/Admin).
   - `pending_review`: Enviado por un Delegado de Área para revisión y aprobación.
   - `published`: Contenido aprobado y visible públicamente en el sitio web (`www.ccunicode.org`).
   - `archived`: Contenido retirado de la vista pública sin pérdida de historial ni auditoría.
4. **Flujo editorial dual y control de permisos por rol y área (`area_scope`):**

| Rol (`cms_user_permissions.role`) | Alcance (`area_scope`) | Flujo Editorial | Permisos sobre `cms_events` y `recruitment_config` |
| :--- | :--- | :--- | :--- |
| **Administrador (`admin`)** | `'ALL'` | **1 paso** (publicación directa) | Crea, edita, publica, archiva y aprueba contenido en todas las áreas; gestiona permisos en `cms_user_permissions` y parámetros de `/call`. |
| **DCC (`dcc`)** | `'ALL'` | **1 paso** (publicación directa) | Crea, edita, publica, archiva y aprueba eventos de todas las áreas y novedades institucionales; administra contenido público de `/call`. |
| **Director de Área (`director`)** | `'<AREA>'` (`ID`, `ACD`, `GTH`, `RRPP`, `DCC`, `LGE`, `FIN`) | **1 paso** + **Aprobador** | Crea, edita, publica y archiva directamente dentro de su área; aprueba (`pending_review` → `published`) o devuelve a borrador (`pending_review` → `draft`) los envíos de su delegado. |
| **Delegado de Área (`delegate`)** | `'<AREA>'` (`ID`, `ACD`, `GTH`, `RRPP`, `DCC`, `LGE`, `FIN`) | **2 pasos** (requiere aprobación) | Crea borradores (`draft`) dentro de su área y los envía a revisión (`pending_review`). No puede transicionar directamente a `published` ni `archived`. |

---

## 7. Diagrama Entidad-Relación (`cms_*` y Tablas Articuladas)

El siguiente diagrama modela las tablas nuevas del módulo CMS (`cms_events`, `cms_audit_logs`, `cms_user_permissions`), su vínculo con `auth.users` de Supabase Auth y su articulación con las tablas existentes de reclutamiento (`recruitment_directors`, `recruitment_config` y `recruitment_config_events`).

```mermaid
erDiagram
    AUTH_USERS {
        uuid id PK "Identificador en Supabase Auth"
        text email UK "Correo institucional o personal"
        timestamptz created_at "Fecha de registro"
    }

    CMS_USER_PERMISSIONS {
        uuid user_id PK,FK "Ref. auth.users(id)"
        text email UK "Vinculo logico con recruitment_directors"
        varchar role "admin | dcc | director | delegate"
        varchar area_scope "ALL | ID | ACD | GTH | RRPP | DCC | LGE | FIN"
        boolean is_active "Habilitacion de acceso al CMS"
        uuid assigned_by FK "Ref. auth.users(id)"
        timestamptz created_at "Creacion del permiso"
        timestamptz updated_at "Ultima actualizacion"
    }

    RECRUITMENT_DIRECTORS {
        text email PK "Correo habilitado por GTH"
        text area "ID | RRPP | GTH | ACD | DCC | LGE | FIN"
        text name "Nombre para mostrar"
        timestamptz created_at "Fecha de alta"
    }

    CMS_EVENTS {
        uuid id PK "gen_random_uuid()"
        varchar slug UK "Identificador URL amigable"
        varchar title "Titulo principal del evento"
        text summary "Subtitulo o lema corto"
        text description "Descripcion completa del evento"
        timestamptz event_date "Fecha y hora canonica de inicio"
        timestamptz end_date "Fecha y hora de fin opcional"
        varchar display_date "Etiqueta legible ej. 1 - 5 Set"
        varchar time_range "Horario ej. 9:30 AM - 1:00 PM"
        varchar location "Sede o modalidad"
        varchar category "Charla | Workshop | Summit | etc."
        varchar area_scope "ALL | ID | ACD | GTH | RRPP | DCC | LGE | FIN"
        varchar speaker "Ponente o area organizadora"
        text speaker_image_url "Supabase Storage - avatar ponente"
        text thumbnail_url "Supabase Storage - miniatura principal"
        text background_image_url "Supabase Storage - fondo de tarjeta"
        text external_url "URL de registro o publicacion externa"
        integer attendees_count "Cantidad de asistentes para KPI"
        text_array highlights "text[] - etiquetas destacadas"
        boolean is_featured "Destacado en Novedades del Home"
        cms_content_status status "draft | pending_review | published | archived"
        uuid created_by FK "Ref. auth.users(id)"
        uuid reviewed_by FK "Ref. auth.users(id)"
        timestamptz published_at "Fecha de primera publicacion"
        timestamptz created_at "Creacion"
        timestamptz updated_at "Actualizacion automatica"
    }

    CMS_AUDIT_LOGS {
        uuid id PK "gen_random_uuid()"
        varchar entity_type "cms_events | recruitment_config"
        uuid entity_id "ID de la entidad auditada"
        varchar action "create | update | submit_review | approve_publish | reject_to_draft | archive"
        cms_content_status from_status "Estado editorial previo"
        cms_content_status to_status "Estado editorial nuevo"
        uuid actor_id FK "Ref. auth.users(id)"
        text actor_email "Correo del usuario que ejecuta la accion"
        varchar area_scope "Area involucrada en el cambio"
        jsonb metadata "Motivo, diff resumido, slug o contexto"
        timestamptz created_at "Marca temporal inmutable"
    }

    RECRUITMENT_CONFIG {
        boolean singleton PK "CHECK (singleton) - fila unica"
        jsonb settings "Parametros operativos + contrato publicCall"
        integer revision "Control de concurrencia optimista"
        timestamptz updated_at "Ultima modificacion"
    }

    RECRUITMENT_CONFIG_EVENTS {
        uuid id PK "gen_random_uuid()"
        text actor "Correo o identificador del administrador"
        text kind "configuration | cms_call_settings | templates | directors | etc."
        jsonb before_value "Snapshot previo sin previewKeyHash"
        jsonb after_value "Snapshot posterior"
        timestamptz created_at "Fecha del evento de auditoria"
    }

    AUTH_USERS ||--o| CMS_USER_PERMISSIONS : "autoriza perfil CMS"
    RECRUITMENT_DIRECTORS |o--o| CMS_USER_PERMISSIONS : "homologa email y area"
    AUTH_USERS ||--o{ CMS_EVENTS : "crea (created_by)"
    AUTH_USERS ||--o{ CMS_EVENTS : "revisa o aprueba (reviewed_by)"
    AUTH_USERS ||--o{ CMS_AUDIT_LOGS : "registra accion (actor_id)"
    CMS_EVENTS ||--o{ CMS_AUDIT_LOGS : "genera trazabilidad (entity_id)"
    RECRUITMENT_CONFIG ||--o{ RECRUITMENT_CONFIG_EVENTS : "audita mutaciones de settings"
    CMS_USER_PERMISSIONS ||--o{ RECRUITMENT_CONFIG_EVENTS : "actua como actor autorizado"
```

---

## 8. Diccionario de Datos Detallado

### 8.1 Tipo Enumerado `public.cms_content_status`

| Valor | Significado | Visibilidad Pública | Transiciones Permitidas |
| :--- | :--- | :--- | :--- |
| `'draft'` | Borrador inicial o devuelto tras revisión. | No | → `'pending_review'` (Delegado) / → `'published'` (Director, DCC, Admin) / → `'archived'` (Director, DCC, Admin). |
| `'pending_review'` | Enviado por un Delegado esperando aprobación de su Director o DCC. | No | → `'published'` (Aprobado) / → `'draft'` (Observado o devuelto) / → `'archived'`. |
| `'published'` | Contenido oficial visible en `/`, `/events` y endpoints públicos. | Sí | → `'draft'` (Despublicar para edición) / → `'archived'` (Retirar del sitio). |
| `'archived'` | Evento histórico oculto del sitio público conservado para auditoría. | No | → `'draft'` (Restaurar) / → `'published'` (Republicar por Director, DCC o Admin). |

### 8.2 Tabla `public.cms_events`

Consolidación relacional para **Próximos Eventos**, **Eventos Realizados** y la sección **Novedades** del inicio, cubriendo el 100% de las propiedades consumidas por los componentes actuales de Astro (`src/data/events.ts`, `src/components/components-events/upcoming-events.astro`, `src/components/components-events/completed-events.astro` y `src/components/components-home/news.astro`).

| Columna | Tipo de dato | Restricciones (Constraints) | Descripción (Propósito y Consumo en Frontend) |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Identificador único global autogenerado del evento. |
| `slug` | `varchar(160)` | `UNIQUE NOT NULL`, Check formato kebab-case | Identificador único legible para URLs y trazabilidad (ej. `discover-data-world-2026`). |
| `title` | `varchar(200)` | `NOT NULL` | Título principal del evento (usado en tarjetas de realizados, novedades y título de próximos). |
| `summary` | `text` | `NULL` | Resumen corto o lema/tópico destacado (ej. `topic` en `upcoming-events.astro` o extracto para `news-card.astro`). |
| `description` | `text` | `NOT NULL` | Descripción completa mostrada en el detalle de la tarjeta. |
| `event_date` | `timestamptz` | `NOT NULL` | Fecha y hora canónica del evento (con zona horaria). Determina orden cronológico y separación automática entre próximos (`>= now()`) y realizados (`< now()`). |
| `end_date` | `timestamptz` | `NULL`, `CHECK (end_date IS NULL OR end_date >= event_date)` | Fecha/hora de cierre para eventos de múltiples días (ej. Software Week). |
| `display_date` | `varchar(80)` | `NULL` | Etiqueta textual opcional para fechas aproximadas o rangos (ej. `"23 May"`, `"1 – 5 Set"`, `"Sep 2025"`). Si es `NULL`, se formatea `event_date` en zona `America/Lima`. |
| `time_range` | `varchar(80)` | `NULL` | Horario legible mostrado en `upcoming-events.astro` (ej. `"9:30 AM – 1:00 PM"`, `"Por definir"`). |
| `location` | `varchar(150)` | `NOT NULL` | Lugar presencial o modalidad del evento (ej. `"Auditorio FIIS"`, `"Auditorio CTIC – UNI"`). |
| `category` | `varchar(60)` | `NOT NULL`, Check catálogo oficial | Categoría visual mapeada a `categoryBadge`: `'Hackathon'`, `'Workshop'`, `'Charla'`, `'Competencia'`, `'Panel'`, `'Integración'`, `'Social'`, `'Clase'`, `'Summit'`. |
| `area_scope` | `varchar(20)` | `NOT NULL`, Check siglas válidas | Área responsable del evento para control editorial RLS: `'ALL'` (institucional), `'ID'`, `'ACD'`, `'GTH'`, `'RRPP'`, `'DCC'`, `'LGE'`, `'FIN'`. |
| `speaker` | `varchar(200)` | `NULL` | Nombre del ponente, invitados o área organizadora (mapea tanto a `UpcomingEvent.speaker` como a `CompletedEvent.speaker`). |
| `speaker_image_url` | `text` | `NULL` | URL pública o ruta en Supabase Storage para la imagen del ponente/mascota (`UpcomingEvent.speakerImage`). |
| `thumbnail_url` | `text` | `NOT NULL` | URL pública o ruta en Supabase Storage (WebP optimizada) para la miniatura principal en realizados (`CompletedEvent.image`) y Home (`NewsCard.image`). |
| `background_image_url` | `text` | `NULL` | URL pública o ruta en Supabase Storage para la imagen de fondo de la tarjeta en `upcoming-events.astro` (`UpcomingEvent.backgroundImage`). |
| `external_url` | `text` | `NULL` | Enlace externo de inscripción (`UpcomingEvent.registrationUrl`, ej. Luma) o publicación/reseña (`CompletedEvent.link`, ej. Instagram/LinkedIn/Facebook). |
| `attendees_count` | `integer` | `NOT NULL DEFAULT 0`, `CHECK (attendees_count >= 0)` | Conteo de asistentes del evento realizado; alimenta el KPI animado `totalAsistentes` en `completed-events.astro`. |
| `highlights` | `text[]` | `NOT NULL DEFAULT '{}'` | Arreglo de palabras clave renderizadas como etiquetas `#tag` en la grilla desktop de `completed-events.astro`. |
| `is_featured` | `boolean` | `NOT NULL DEFAULT false` | Indica si el evento debe priorizarse en el carrusel **Novedades** (`news.astro`) de la página principal. |
| `status` | `cms_content_status` | `NOT NULL DEFAULT 'draft'` | Estado del flujo editorial (`'draft'`, `'pending_review'`, `'published'`, `'archived'`). |
| `created_by` | `uuid` | `NULL`, FK → `auth.users(id) ON DELETE SET NULL` | UUID del usuario autenticado (Delegado, Director, DCC o Admin) que creó el registro. |
| `reviewed_by` | `uuid` | `NULL`, FK → `auth.users(id) ON DELETE SET NULL` | UUID del Director, DCC o Admin que aprobó/revisó la publicación. |
| `published_at` | `timestamptz` | `NULL` | Marca temporal de publicación oficial (asignada automáticamente al pasar a `'published'`). |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Fecha y hora de creación del registro. |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Fecha y hora de última modificación (actualizada automáticamente vía trigger). |

#### Mapeo Directo hacia los Componentes Actuales de Astro (`src/`)

| Propiedad Actual en `src/data/events.ts` | Componente Consumidor | Columna en `public.cms_events` | Regla de Compatibilidad |
| :--- | :--- | :--- | :--- |
| `UpcomingEvent.speaker` | `upcoming-events.astro` | `COALESCE(speaker, title)` | Si `speaker` se usa como cabecera del próximo evento, mantiene compatibilidad visual exacta. |
| `UpcomingEvent.topic` | `upcoming-events.astro` | `summary` | Lema o subtítulo entre comillas de la tarjeta. |
| `UpcomingEvent.date` / `CompletedEvent.date` | `upcoming-events.astro`, `completed-events.astro` | `COALESCE(display_date, format(event_date))` | Permite fechas exactas y rangos textuales (`"1 – 5 Set"`). |
| `UpcomingEvent.time` | `upcoming-events.astro` | `time_range` | Texto de horario o `"Por definir"`. |
| `UpcomingEvent.speakerImage` | `upcoming-events.astro` | `COALESCE(speaker_image_url, thumbnail_url)` | Bucket de Supabase Storage. |
| `UpcomingEvent.backgroundImage` | `upcoming-events.astro` | `COALESCE(background_image_url, thumbnail_url)` | Bucket de Supabase Storage. |
| `UpcomingEvent.registrationUrl` / `CompletedEvent.link` | `upcoming-events.astro`, `completed-events.astro`, `news.astro` | `external_url` | Si es `NULL` o vacío en próximos eventos, el botón muestra `"Próximamente"`. |
| `CompletedEvent.title` / `Novedad.title` | `completed-events.astro`, `news-card.astro` | `title` | Título principal de la tarjeta. |
| `CompletedEvent.attendees` | `completed-events.astro` | `attendees_count` | Suma total para el contador KPI de asistentes. |
| `CompletedEvent.category` | `completed-events.astro` | `category` | Mapeado al diccionario `categoryBadge` y KPI de categorías. |
| `CompletedEvent.image` / `Novedad.image` | `completed-events.astro`, `news-card.astro` | `thumbnail_url` | Miniatura principal WebP en Supabase Storage. |
| `CompletedEvent.highlights` | `completed-events.astro` | `highlights` | Etiquetas `#tag` mostradas en la tarjeta desktop. |

### 8.3 Tabla `public.cms_audit_logs`

Registro inmutable (*append-only*) de trazabilidad editorial para todas las operaciones relevantes dentro del módulo CMS (cambios de estado en `cms_events` y auditoría complementaria cuando el CMS muta parámetros de entidades administradas).

| Columna | Tipo de dato | Restricciones (Constraints) | Descripción (Propósito) |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Identificador único del evento de auditoría. |
| `entity_type` | `varchar(50)` | `NOT NULL` | Nombre lógico de la entidad afectada (ej. `'cms_events'`, `'recruitment_config'`). |
| `entity_id` | `uuid` | `NOT NULL` | UUID del registro afectado (para `recruitment_config`, se usa un UUID determinístico de singleton o referencia en `metadata`). |
| `action` | `varchar(50)` | `NOT NULL` | Acción ejecutada: `'create'`, `'update'`, `'submit_review'`, `'approve_publish'`, `'reject_to_draft'`, `'archive'`, `'restore'`. |
| `from_status` | `cms_content_status` | `NULL` | Estado editorial anterior (es `NULL` en la creación inicial). |
| `to_status` | `cms_content_status` | `NULL` | Estado editorial resultante de la acción. |
| `actor_id` | `uuid` | `NULL`, FK → `auth.users(id) ON DELETE SET NULL` | Referencia al usuario autenticado que ejecutó la operación. |
| `actor_email` | `text` | `NOT NULL` | Correo electrónico del actor capturado al momento del cambio (preserva trazabilidad si se elimina la cuenta). |
| `area_scope` | `varchar(20)` | `NULL` | Área asociada a la operación (`'ALL'`, `'ID'`, `'ACD'`, `'GTH'`, `'RRPP'`, `'DCC'`, `'LGE'`, `'FIN'`). |
| `metadata` | `jsonb` | `NOT NULL DEFAULT '{}'::jsonb` | Contexto adicional estructurado: `title`, `slug`, `review_comment` (motivo de rechazo/aprobación), `changed_fields`, etc. |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Marca temporal exacta del registro de auditoría. |

### 8.4 Tabla de Autorización `public.cms_user_permissions` (Articulación con `auth.users` y `recruitment_directors`)

Permite aplicar **Row Level Security (RLS)** granular directamente en PostgreSQL para el flujo editorial dual, evitando depender únicamente de validaciones en cliente o contraseñas compartidas.

| Columna | Tipo de dato | Restricciones (Constraints) | Descripción (Propósito) |
| :--- | :--- | :--- | :--- |
| `user_id` | `uuid` | `PRIMARY KEY`, FK → `auth.users(id) ON DELETE CASCADE` | Identificador del usuario en Supabase Auth. |
| `email` | `text` | `UNIQUE NOT NULL`, `CHECK (email = lower(email))` | Correo normalizado; permite vincular y homologar cuentas registradas en `public.recruitment_directors(email)`. |
| `role` | `varchar(20)` | `NOT NULL`, `CHECK (role IN ('admin', 'dcc', 'director', 'delegate'))` | Rol operativo dentro del CMS. |
| `area_scope` | `varchar(20)` | `NOT NULL`, `CHECK (area_scope IN ('ALL', 'ID', 'ACD', 'GTH', 'RRPP', 'DCC', 'LGE', 'FIN'))` | Ámbito de escritura. Regla `CHECK`: `'admin'` y `'dcc'` deben tener `area_scope = 'ALL'`; `'director'` y `'delegate'` deben tener un área específica (`area_scope <> 'ALL'`). |
| `is_active` | `boolean` | `NOT NULL DEFAULT true` | Interruptor de revocación inmediata sin borrar trazabilidad histórica. |
| `assigned_by` | `uuid` | `NULL`, FK → `auth.users(id) ON DELETE SET NULL` | Administrador que otorgó o modificó el permiso. |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Fecha de alta en el CMS. |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Última actualización de rol o ámbito. |

---

## 9. Contrato JSONB para `recruitment_config.settings` (Integración con `/call`)

### 9.1 Propiedades Existentes Inmutables (Retrocompatibilidad)

De acuerdo con `src/lib/recruitment/types.ts`, `src/lib/recruitment/validation.ts` y la función PostgreSQL `public.recruitment_public_config()` (actualizada en `supabase/migrations/20261003_recruitment_preview.sql`), el campo `recruitment_config.settings` almacena actualmente las siguientes claves de nivel raíz que **no deben renombrarse ni eliminarse**:

| Propiedad Raíz Actual | Tipo JSON / TS | Consumidores Críticos Existentes |
| :--- | :--- | :--- |
| `enabled` | `boolean` | `recruitment_assert_open()`, `HeroCall.astro`, `/api/recruitment/config` |
| `title` | `string` | `HeroCall.astro`, plantillas de correo (`{{title}}`), `/admin/recruitment` |
| `opensAt` | `string \| null` (ISO-8601 con zona) | `recruitment_assert_open()`, countdown de apertura en `HeroCall.astro` |
| `closesAt` | `string \| null` (ISO-8601 con zona) | `recruitment_assert_open()`, countdown de cierre en `HeroCall.astro`, `recruitment_expire_drafts()` |
| `extensionAt` | `string \| null` (ISO-8601 con zona) | `recruitment_assert_open()`, prórroga automática (`20261017_recruitment_prorroga_reactivacion.sql`) |
| `emailPausedUntil` | `string \| null` (opcional) | `processEmails()` en `src/lib/recruitment/service.ts` |
| `previewKeyHash` | `string` (opcional, solo servidor) | `recruitment_preview_active()` (siempre excluido en `recruitment_public_config()` y `recruitment_admin_config()`) |
| `draftsPerIpPerHour` | `integer` (opcional, default `30`) | `recruitment_create_draft()` |
| `maxApplicants` | `integer` | `recruitment_public_config()`, `recruitment_create_draft()`, `recruitment_submit()` |
| `minAvailabilityHours` | `number \| null` | `recruitment_assert_open()`, `recruitment_submit()` |
| `maxVideoSeconds` | `integer` | `recruitment_begin_upload()`, `recruitment_complete_upload()`, `validateConfig()` |
| `maxVideoBytes` | `integer` | `recruitment_begin_upload()`, `validateConfig()` |
| `questionsPerCategory` | `integer` | `recruitment_create_draft()`, `validateConfig()` |
| `preparationSeconds` | `integer` | `recruitment-form.ts` |
| `inactivityHours` | `integer` | `recruitment_expire_drafts()` |
| `shortCasePrompt` | `string` | `/postular` |
| `storageProvider` | `'drive' \| 'supabase'` | `videoSession()` (excluido de `recruitment_public_config()`) |
| `thresholds` | `{ affinity, written, video }` | Panel administrativo (excluido de `recruitment_public_config()`) |
| `areas` | `RecruitmentArea[]` (`{ id, name, enabled, quota }`) | `HeroCall.astro` (filtra íconos de áreas habilitadas), `recruitment_submit()`, `recruitment_transition()` |
| `questions` | `RecruitmentQuestion[]` | `recruitment_create_draft()` (excluido de `recruitment_public_config()`) |
| `videoRubric` | `VideoRubricCriterion[]` | Evaluación de videos en `/admin/recruitment` |

> **Nota crítica de implementación (`src/lib/recruitment/validation.ts`):** La función `recruitment_public_config()` en PostgreSQL ya retorna `c - 'questions' - 'thresholds' - 'storageProvider' - 'previewKeyHash'`, por lo que cualquier propiedad adicional agregada bajo `settings.publicCall` es entregada automáticamente a `/call`. Sin embargo, `validateConfig()` en `src/lib/recruitment/validation.ts` reconstruye actualmente el objeto `RecruitmentConfig` con una lista fija de propiedades; por tanto, al implementar el guardado en código, se deberá incluir `publicCall` en `validateConfig()` (o usar un RPC de actualización parcial que haga merge sobre `settings`) para evitar que guardar desde `/admin/recruitment` borre los datos editados desde el CMS.

### 9.2 Esquema TypeScript Propuesto (`settings.publicCall`)

Para administrar desde el CMS la vista pública `/call` (estado abierta/cerrada, cronograma/fechas clave, estado/enlace del formulario y requisitos/perfiles por las 6 áreas visibles en `HeroCall.astro`: `ID`, `ACD`, `GTH`, `RRPP`, `DCC`, `LGE`), se añade el nodo opcional `publicCall` dentro de `recruitment_config.settings`:

```typescript
export type PublicCallAreaId = 'ID' | 'ACD' | 'GTH' | 'RRPP' | 'DCC' | 'LGE';

export interface RecruitmentScheduleStage {
  id: string;                 // Ej. "inscripciones", "entrevistas", "resultados"
  order: number;              // Orden ascendente de visualización en /call
  title: string;              // Ej. "Cierre de postulaciones y envío de video"
  description: string;        // Detalle breve de la etapa
  startAt: string | null;     // ISO-8601 con zona horaria (America/Lima -> -05:00)
  endAt: string | null;       // ISO-8601 con zona horaria
  displayDate: string;        // Texto amigable ej. "15 – 28 de Marzo"
  status: 'upcoming' | 'active' | 'completed';
}

export interface RecruitmentAreaPublicProfile {
  areaId: PublicCallAreaId;   // 'ID' | 'ACD' | 'GTH' | 'RRPP' | 'DCC' | 'LGE'
  areaName: string;           // Nombre oficial mostrado en /call
  shortDescription: string;   // Resumen del rol del área en UNICODE
  targetProfile: string;      // Perfil general buscado
  requirements: string[];     // Equivalente a whatWeLookFor (requisitos mínimos/deseados)
  preferredSkills: string[];  // Equivalente a weValue (conocimientos valorados)
  benefits: string[];         // Equivalente a whatYouWin (qué gana el integrante)
}

export interface RecruitmentPublicCallSettings {
  statusBanner: {
    openHeadline: string;     // Ej. "CONVOCATORIA ABIERTA"
    upcomingHeadline: string; // Ej. "PRÓXIMA APERTURA"
    closedHeadline: string;   // Ej. "PRÓXIMAMENTE"
    openDescription: string;  // Texto introductorio cuando available = true
    closedMessage: string;    // Mensaje público cuando available = false
    showCountdown: boolean;   // Controla visibilidad de temporizadores en HeroCall
  };
  form: {
    isActive: boolean;        // Habilita o pausa el botón CTA hacia el formulario
    mode: 'internal' | 'external';
    url: string;              // Por defecto "/postular"; permite URL externa si aplica
    ctaLabel: string;         // Ej. "Postula a UNICODE"
    closedCtaLabel: string;   // Ej. "Próximamente"
  };
  schedule: RecruitmentScheduleStage[];
  areaProfiles: Record<PublicCallAreaId, RecruitmentAreaPublicProfile>;
}

export interface RecruitmentConfigWithCms extends RecruitmentConfig {
  publicCall?: RecruitmentPublicCallSettings;
}
```

### 9.3 Ejemplo de Contrato JSONB Completo dentro de `recruitment_config.settings`

```json
{
  "enabled": true,
  "title": "Convocatoria UNICODE 2026-II",
  "opensAt": "2026-08-10T09:00:00-05:00",
  "closesAt": "2026-08-24T23:59:59-05:00",
  "extensionAt": null,
  "maxApplicants": 150,
  "minAvailabilityHours": 6,
  "maxVideoSeconds": 210,
  "maxVideoBytes": 20971520,
  "questionsPerCategory": 2,
  "preparationSeconds": 45,
  "inactivityHours": 24,
  "shortCasePrompt": "Describe cómo abordarías un problema habitual del área a la que postulas.",
  "storageProvider": "drive",
  "thresholds": { "affinity": null, "written": null, "video": null },
  "areas": [
    { "id": "ID", "name": "Investigación y Desarrollo", "enabled": true, "quota": 8 },
    { "id": "ACD", "name": "Académica", "enabled": true, "quota": 6 },
    { "id": "GTH", "name": "Gestión del Talento Humano", "enabled": true, "quota": 4 },
    { "id": "RRPP", "name": "Relaciones Públicas", "enabled": true, "quota": 5 },
    { "id": "DCC", "name": "Dirección de Comunicación y Contenido", "enabled": true, "quota": 5 },
    { "id": "LGE", "name": "Logística y Gestión de Eventos", "enabled": true, "quota": 6 },
    { "id": "FIN", "name": "Finanzas", "enabled": false, "quota": null }
  ],
  "questions": [],
  "videoRubric": [],
  "publicCall": {
    "statusBanner": {
      "openHeadline": "CONVOCATORIA ABIERTA",
      "upcomingHeadline": "PRÓXIMA APERTURA",
      "closedHeadline": "PRÓXIMAMENTE",
      "openDescription": "Encuentra el área donde puedes aportar a UNICODE. Completa tus datos y responde cuatro preguntas en un video.",
      "closedMessage": "La convocatoria se encuentra cerrada por el momento. ¡Gracias por tu interés!",
      "showCountdown": true
    },
    "form": {
      "isActive": true,
      "mode": "internal",
      "url": "/postular",
      "ctaLabel": "Postula a UNICODE",
      "closedCtaLabel": "Próximamente"
    },
    "schedule": [
      {
        "id": "registration",
        "order": 1,
        "title": "Inscripciones y envío de video",
        "description": "Registro de formulario y grabación de respuestas en /postular.",
        "startAt": "2026-08-10T09:00:00-05:00",
        "endAt": "2026-08-24T23:59:59-05:00",
        "displayDate": "10 – 24 de Agosto",
        "status": "active"
      },
      {
        "id": "interviews",
        "order": 2,
        "title": "Evaluación de perfiles y dinámicas",
        "description": "Revisión por directores de área y entrevistas personales.",
        "startAt": "2026-08-26T09:00:00-05:00",
        "endAt": "2026-09-02T22:00:00-05:00",
        "displayDate": "26 Ago – 2 Set",
        "status": "upcoming"
      },
      {
        "id": "results",
        "order": 3,
        "title": "Publicación de resultados e integración",
        "description": "Notificación por correo institucional e inicio de onboarding.",
        "startAt": "2026-09-05T18:00:00-05:00",
        "endAt": null,
        "displayDate": "5 de Setiembre",
        "status": "upcoming"
      }
    ],
    "areaProfiles": {
      "ID": {
        "areaId": "ID",
        "areaName": "Investigación y Desarrollo",
        "shortDescription": "Transformamos ideas en código, plataformas web, IA y soluciones tecnológicas reales.",
        "targetProfile": "Estudiantes apasionados por la programación, la arquitectura de software y la innovación.",
        "requirements": [
          "Interés sólido en desarrollo web, móvil, ciencia de datos o inteligencia artificial.",
          "Capacidad para resolver problemas lógicos y trabajar en equipo.",
          "Disponibilidad mínima semanal de 6 horas."
        ],
        "preferredSkills": [
          "Conocimientos básicos de control de versiones (Git/GitHub).",
          "Nociones de algoritmos, estructuras de datos o TypeScript/Python."
        ],
        "benefits": [
          "Participación en proyectos reales de software y hardware.",
          "Mentoría técnica de miembros experimentados."
        ]
      },
      "ACD": {
        "areaId": "ACD",
        "areaName": "Académica",
        "shortDescription": "Impulsamos el aprendizaje continuo mediante talleres, grupos de estudio y concursos.",
        "targetProfile": "Estudiantes con vocación de enseñanza, investigación y organización académica.",
        "requirements": [
          "Interés en diseñar rutas de aprendizaje, ponencias o concursos académicos.",
          "Buena comunicación oral y escrita."
        ],
        "preferredSkills": [
          "Experiencia previa dictando asesorías, auxiliaturas o talleres."
        ],
        "benefits": [
          "Liderazgo en eventos académicos como BEE Geometry y Software Week."
        ]
      },
      "GTH": {
        "areaId": "GTH",
        "areaName": "Gestión del Talento Humano",
        "shortDescription": "Cuidamos la cultura organizacional, el reclutamiento, el clima interno y el onboarding.",
        "targetProfile": "Estudiantes empáticos con habilidades de liderazgo, evaluación de talento y clima laboral.",
        "requirements": [
          "Interés en selección de personal, integración de equipos y seguimiento de miembros.",
          "Confidencialidad y criterio objetivo para procesos de evaluación."
        ],
        "preferredSkills": [
          "Manejo de herramientas de encuestas, análisis básico de métricas y entrevistas."
        ],
        "benefits": [
          "Experiencia práctica gestionando convocatorias y cultura estudiantil."
        ]
      },
      "RRPP": {
        "areaId": "RRPP",
        "areaName": "Relaciones Públicas",
        "shortDescription": "Construimos alianzas estratégicas con empresas, comunidades tech e instituciones.",
        "targetProfile": "Estudiantes proactivos con facilidad para el networking, negociación y vocería.",
        "requirements": [
          "Habilidades de comunicación profesional y redacción formal.",
          "Capacidad para gestionar convenios, auspicios y contacto con ponentes."
        ],
        "preferredSkills": [
          "Experiencia en representación estudiantil o gestión de alianzas."
        ],
        "benefits": [
          "Contacto directo con líderes de la industria tecnológica y comunidades aliadas."
        ]
      },
      "DCC": {
        "areaId": "DCC",
        "areaName": "Dirección de Comunicación y Contenido",
        "shortDescription": "Diseñamos la identidad visual, redes sociales, cobertura audiovisual y storytelling de UNICODE.",
        "targetProfile": "Estudiantes creativos con afinidad por el diseño gráfico, copywriting, fotografía o video.",
        "requirements": [
          "Capacidad para comunicar iniciativas tecnológicas de forma clara y atractiva.",
          "Compromiso con el cumplimiento de calendarios de publicación."
        ],
        "preferredSkills": [
          "Manejo de Figma, Canva, Illustrator, Premiere o herramientas de edición."
        ],
        "benefits": [
          "Construcción de portafolio real en campañas de impacto universitario."
        ]
      },
      "LGE": {
        "areaId": "LGE",
        "areaName": "Logística y Gestión de Eventos",
        "shortDescription": "Planificamos y ejecutamos la operación presencial y virtual de charlas, summits y talleres.",
        "targetProfile": "Estudiantes organizados, resolutivos y orientados al detalle operativo.",
        "requirements": [
          "Capacidad para coordinar espacios, permisos, cronogramas y recursos.",
          "Resolución rápida de imprevistos durante eventos en vivo."
        ],
        "preferredSkills": [
          "Experiencia organizando eventos estudiantiles, hackathones o congresos."
        ],
        "benefits": [
          "Experiencia dirigiendo la logística de eventos con más de 100 asistentes."
        ]
      }
    }
  }
}
```

### 9.4 Protocolo Transaccional de Actualización (`revision` y `recruitment_config_events`)

Toda actualización desde el CMS sobre los parámetros de `/call` en `public.recruitment_config` debe ejecutarse dentro de una **única transacción atómica** en PostgreSQL:

1. **Bloqueo de fila singleton (`FOR UPDATE`):**
   `SELECT * INTO v_current FROM public.recruitment_config WHERE singleton FOR UPDATE;`
2. **Validación de concurrencia optimista (`revision`):**
   Se compara el parámetro `p_expected_revision` enviado por el cliente CMS contra `v_current.revision`. Si difieren, la transacción aborta con código `revision_conflict` (HTTP `409 Conflict`), evitando sobrescribir cambios simultáneos hechos desde `/admin/recruitment` o por otro editor.
3. **Preservación de secretos internos:**
   Se conserva intacto `previewKeyHash` y se fusionan únicamente los campos permitidos (`settings || jsonb_build_object(...)`), manteniendo intactas las propiedades operativas (`questions`, `thresholds`, `storageProvider`, `videoRubric`, etc.).
4. **Auditoría en `public.recruitment_config_events`:**
   Antes de sobrescribir la fila, se inserta el registro histórico:
   ```sql
   INSERT INTO public.recruitment_config_events (actor, kind, before_value, after_value)
   VALUES (
     p_actor_email,
     'cms_call_settings',
     v_current.settings - 'previewKeyHash',
     v_next_settings - 'previewKeyHash'
   );
   ```
   *(Adicionalmente, puede emitirse un registro espejo en `public.cms_audit_logs` con `entity_type = 'recruitment_config'` para consolidar la vista de actividad en el panel CMS).*
5. **Incremento de versión y timestamp:**
   ```sql
   UPDATE public.recruitment_config
   SET settings   = v_next_settings,
       revision   = revision + 1,
       updated_at = now()
   WHERE singleton;
   ```

---

## 10. Script SQL Preliminar Validado (PostgreSQL / Supabase)

El siguiente script DDL es idempotente y sintácticamente válido para **PostgreSQL 15+ (Supabase)**. Crea el enum editorial, las tablas `cms_user_permissions`, `cms_events` y `cms_audit_logs`, sus índices de rendimiento, los triggers automáticos de auditoría temporal y las políticas **RLS (Row Level Security)** alineadas al flujo editorial dual.

```sql
-- ============================================================================
-- CMS UNICODE — ENTREGA 1 (Eventos, Auditoría y Permisos Editoriales)
-- Script DDL preliminar para PostgreSQL / Supabase
-- Nota: No modifica la tabla histórica `applicants` ni las tablas `recruitment_*`.
-- ============================================================================

-- 1. Tipo enumerado para el ciclo de vida editorial (4 estados)
DO $$
BEGIN
    CREATE TYPE public.cms_content_status AS ENUM (
        'draft',
        'pending_review',
        'published',
        'archived'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

-- 2. Tabla de permisos editoriales por usuario y área
CREATE TABLE IF NOT EXISTS public.cms_user_permissions (
    user_id     uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       text        NOT NULL UNIQUE
                            CHECK (email = lower(email) AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    role        varchar(20) NOT NULL
                            CHECK (role IN ('admin', 'dcc', 'director', 'delegate')),
    area_scope  varchar(20) NOT NULL
                            CHECK (area_scope IN ('ALL', 'ID', 'ACD', 'GTH', 'RRPP', 'DCC', 'LGE', 'FIN')),
    is_active   boolean     NOT NULL DEFAULT true,
    assigned_by uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),

    -- Consistencia estricta entre rol global vs. rol por área
    CONSTRAINT chk_cms_role_scope_consistency CHECK (
        (role IN ('admin', 'dcc') AND area_scope = 'ALL')
        OR
        (role IN ('director', 'delegate') AND area_scope <> 'ALL')
    )
);

-- 3. Tabla principal de Eventos y Novedades del CMS
CREATE TABLE IF NOT EXISTS public.cms_events (
    id                   uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
    slug                 varchar(160)       NOT NULL UNIQUE
                                            CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    title                varchar(200)       NOT NULL,
    summary              text               NULL,
    description          text               NOT NULL,
    event_date           timestamptz        NOT NULL,
    end_date             timestamptz        NULL,
    display_date         varchar(80)        NULL,
    time_range           varchar(80)        NULL,
    location             varchar(150)       NOT NULL,
    category             varchar(60)        NOT NULL
                                            CHECK (category IN (
                                                'Hackathon',
                                                'Workshop',
                                                'Charla',
                                                'Competencia',
                                                'Panel',
                                                'Integración',
                                                'Social',
                                                'Clase',
                                                'Summit'
                                            )),
    area_scope           varchar(20)        NOT NULL
                                            CHECK (area_scope IN ('ALL', 'ID', 'ACD', 'GTH', 'RRPP', 'DCC', 'LGE', 'FIN')),
    speaker              varchar(200)       NULL,
    speaker_image_url    text               NULL,
    thumbnail_url        text               NOT NULL,
    background_image_url text               NULL,
    external_url         text               NULL,
    attendees_count      integer            NOT NULL DEFAULT 0
                                            CHECK (attendees_count >= 0),
    highlights           text[]             NOT NULL DEFAULT '{}'::text[],
    is_featured          boolean            NOT NULL DEFAULT false,
    status               public.cms_content_status NOT NULL DEFAULT 'draft',
    created_by           uuid               NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_by          uuid               NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    published_at         timestamptz        NULL,
    created_at           timestamptz        NOT NULL DEFAULT now(),
    updated_at           timestamptz        NOT NULL DEFAULT now(),

    CONSTRAINT chk_cms_events_date_range CHECK (
        end_date IS NULL OR end_date >= event_date
    )
);

-- 4. Tabla inmutable de trazabilidad editorial (Audit Logs)
CREATE TABLE IF NOT EXISTS public.cms_audit_logs (
    id          uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type varchar(50)               NOT NULL,
    entity_id   uuid                      NOT NULL,
    action      varchar(50)               NOT NULL
                                          CHECK (action IN (
                                              'create',
                                              'update',
                                              'submit_review',
                                              'approve_publish',
                                              'reject_to_draft',
                                              'archive',
                                              'restore'
                                          )),
    from_status public.cms_content_status NULL,
    to_status   public.cms_content_status NULL,
    actor_id    uuid                      NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_email text                      NOT NULL,
    area_scope  varchar(20)               NULL,
    metadata    jsonb                     NOT NULL DEFAULT '{}'::jsonb,
    created_at  timestamptz               NOT NULL DEFAULT now()
);

-- 5. Índices optimizados para consultas públicas (LCP < 2.5s) y panel editorial
CREATE INDEX IF NOT EXISTS idx_cms_events_status
    ON public.cms_events (status);

CREATE INDEX IF NOT EXISTS idx_cms_events_event_date
    ON public.cms_events (event_date DESC);

CREATE INDEX IF NOT EXISTS idx_cms_events_is_featured
    ON public.cms_events (is_featured, event_date DESC)
    WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_cms_events_area_scope
    ON public.cms_events (area_scope, status);

CREATE INDEX IF NOT EXISTS idx_cms_audit_logs_entity
    ON public.cms_audit_logs (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cms_audit_logs_actor
    ON public.cms_audit_logs (actor_id, created_at DESC);

-- 6. Funciones y Triggers automáticos (updated_at y published_at)
CREATE OR REPLACE FUNCTION public.cms_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cms_sync_published_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
        IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published' THEN
            NEW.published_at := now();
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cms_user_permissions_updated_at ON public.cms_user_permissions;
CREATE TRIGGER trg_cms_user_permissions_updated_at
    BEFORE UPDATE ON public.cms_user_permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.cms_set_updated_at();

DROP TRIGGER IF EXISTS trg_cms_events_updated_at ON public.cms_events;
CREATE TRIGGER trg_cms_events_updated_at
    BEFORE UPDATE ON public.cms_events
    FOR EACH ROW
    EXECUTE FUNCTION public.cms_set_updated_at();

DROP TRIGGER IF EXISTS trg_cms_events_published_at ON public.cms_events;
CREATE TRIGGER trg_cms_events_published_at
    BEFORE INSERT OR UPDATE ON public.cms_events
    FOR EACH ROW
    EXECUTE FUNCTION public.cms_sync_published_at();

-- 7. Función auxiliar RLS (evita recursión al evaluar permisos del usuario autenticado)
CREATE OR REPLACE FUNCTION public.cms_current_permission()
RETURNS TABLE (role varchar, area_scope varchar)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT p.role, p.area_scope
    FROM public.cms_user_permissions p
    WHERE p.user_id = auth.uid()
      AND p.is_active = true
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.cms_current_permission() FROM public;
GRANT EXECUTE ON FUNCTION public.cms_current_permission() TO authenticated, service_role;

-- 8. Seguridad a Nivel de Fila (RLS obligatorio)
ALTER TABLE public.cms_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para `cms_user_permissions`
DROP POLICY IF EXISTS "Usuario autenticado consulta su propio permiso CMS" ON public.cms_user_permissions;
CREATE POLICY "Usuario autenticado consulta su propio permiso CMS"
    ON public.cms_user_permissions
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE cp.role = 'admin' AND cp.area_scope = 'ALL'
        )
    );

DROP POLICY IF EXISTS "Solo admin global gestiona permisos CMS" ON public.cms_user_permissions;
CREATE POLICY "Solo admin global gestiona permisos CMS"
    ON public.cms_user_permissions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE cp.role = 'admin' AND cp.area_scope = 'ALL'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE cp.role = 'admin' AND cp.area_scope = 'ALL'
        )
    );

-- Políticas para `cms_events`
DROP POLICY IF EXISTS "Lectura publica de eventos publicados" ON public.cms_events;
CREATE POLICY "Lectura publica de eventos publicados"
    ON public.cms_events
    FOR SELECT
    TO anon, authenticated
    USING (status = 'published');

DROP POLICY IF EXISTS "Lectura editorial de borradores y revisiones segun ambito" ON public.cms_events;
CREATE POLICY "Lectura editorial de borradores y revisiones segun ambito"
    ON public.cms_events
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE cp.area_scope = 'ALL'
               OR cp.area_scope = cms_events.area_scope
        )
    );

DROP POLICY IF EXISTS "Creacion de eventos segun flujo dual y area" ON public.cms_events;
CREATE POLICY "Creacion de eventos segun flujo dual y area"
    ON public.cms_events
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE (
                -- Admin y DCC (ALL): publicación directa en cualquier área
                cp.role IN ('admin', 'dcc') AND cp.area_scope = 'ALL'
            ) OR (
                -- Director: publicación directa dentro de su propia área
                cp.role = 'director' AND cp.area_scope = cms_events.area_scope
            ) OR (
                -- Delegado: solo borradores o envío a revisión dentro de su área
                cp.role = 'delegate'
                AND cp.area_scope = cms_events.area_scope
                AND cms_events.status IN ('draft', 'pending_review')
            )
        )
    );

DROP POLICY IF EXISTS "Actualizacion de eventos segun flujo dual y area" ON public.cms_events;
CREATE POLICY "Actualizacion de eventos segun flujo dual y area"
    ON public.cms_events
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE (cp.role IN ('admin', 'dcc') AND cp.area_scope = 'ALL')
               OR (cp.role = 'director' AND cp.area_scope = cms_events.area_scope)
               OR (
                   cp.role = 'delegate'
                   AND cp.area_scope = cms_events.area_scope
                   AND cms_events.status IN ('draft', 'pending_review')
               )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE (cp.role IN ('admin', 'dcc') AND cp.area_scope = 'ALL')
               OR (cp.role = 'director' AND cp.area_scope = cms_events.area_scope)
               OR (
                   cp.role = 'delegate'
                   AND cp.area_scope = cms_events.area_scope
                   AND cms_events.status IN ('draft', 'pending_review')
               )
        )
    );

DROP POLICY IF EXISTS "Eliminacion restringida a Admin global" ON public.cms_events;
CREATE POLICY "Eliminacion restringida a Admin global"
    ON public.cms_events
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE cp.role = 'admin' AND cp.area_scope = 'ALL'
        )
    );

-- Políticas para `cms_audit_logs` (solo inserción y lectura autorizada; inmutable)
DROP POLICY IF EXISTS "Lectura de auditoria CMS segun ambito" ON public.cms_audit_logs;
CREATE POLICY "Lectura de auditoria CMS segun ambito"
    ON public.cms_audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE cp.area_scope = 'ALL'
               OR cp.area_scope = cms_audit_logs.area_scope
        )
    );

DROP POLICY IF EXISTS "Insercion de auditoria CMS para personal activo" ON public.cms_audit_logs;
CREATE POLICY "Insercion de auditoria CMS para personal activo"
    ON public.cms_audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE cp.area_scope = 'ALL'
               OR cp.area_scope = cms_audit_logs.area_scope
        )
    );
```

---

# Módulo CMS Unicode — Entrega 2 (Prioridad 2: Proyectos, Novedades, Alianzas, Métricas y Directiva)

> **Referencia de diseño:** Issue **CMS-5** (`[Doc & BD] Extensión del Modelo Entidad-Relación para Módulos Prioridad 2 (cms_projects, cms_news, cms_alliances, cms_metrics, cms_board_members)`).

Esta entrega extiende el esquema base definido en la **Entrega 1 (Secciones 6 a 10)** reutilizando íntegramente el enumerado `public.cms_content_status`, la tabla de permisos `public.cms_user_permissions`, la función auxiliar RLS `public.cms_current_permission()`, los triggers `cms_set_updated_at()` y `cms_sync_published_at()`, y la tabla inmutable `public.cms_audit_logs` (donde `entity_type` admite también `'cms_projects'`, `'cms_news'`, `'cms_alliances'`, `'cms_metrics'` y `'cms_board_members'`).

---

## 11. Diagrama Entidad-Relación Extendido (Prioridad 1 + Prioridad 2)

El diagrama siguiente incorpora las cinco tablas de Prioridad 2 (`cms_projects`, `cms_news`, `cms_alliances`, `cms_metrics`, `cms_board_members`) y muestra su articulación con `auth.users`, `cms_user_permissions`, `cms_events`, `cms_audit_logs` y la tabla existente `recruitment_directors`.

```mermaid
erDiagram
    AUTH_USERS {
        uuid id PK "Identificador en Supabase Auth"
        text email UK "Correo de cuenta"
    }

    CMS_USER_PERMISSIONS {
        uuid user_id PK,FK "Ref. auth.users(id)"
        text email UK "Correo normalizado"
        varchar role "admin | dcc | director | delegate"
        varchar area_scope "ALL | ID | ACD | GTH | RRPP | DCC | LGE | FIN"
        boolean is_active "Acceso habilitado"
    }

    RECRUITMENT_DIRECTORS {
        text email PK "Correo habilitado por GTH"
        text area "ID | RRPP | GTH | ACD | DCC | LGE | FIN"
        text name "Nombre del director"
        timestamptz created_at "Fecha de alta"
    }

    CMS_EVENTS {
        uuid id PK "gen_random_uuid()"
        varchar slug UK "Slug unico del evento"
        varchar title "Titulo del evento"
        varchar area_scope "ALL | area responsable"
        cms_content_status status "draft | pending_review | published | archived"
        uuid created_by FK "Ref. auth.users(id)"
        uuid reviewed_by FK "Ref. auth.users(id)"
    }

    CMS_PROJECTS {
        uuid id PK "gen_random_uuid()"
        varchar slug UK "Identificador URL amigable"
        varchar title "Nombre del proyecto"
        text description "Resumen breve de tarjeta"
        text long_description "Descripcion completa del modal"
        varchar project_status "Active | Inactive"
        varchar area_scope "ALL | ID | ACD | GTH | RRPP | DCC | LGE | FIN"
        varchar faculty_badge "Etiqueta visible ej. ID, DCC, ACD"
        varchar category "Etiqueta destacada ej. Destacado"
        boolean is_featured "Mostrado en slider de destacados"
        text thumbnail_url "Supabase Storage - miniatura WebP"
        varchar image_position "center | top | bottom | left | right"
        text_array screenshots "text[] - capturas del modal"
        jsonb team "Arreglo de integrantes y LinkedIn"
        text_array tech_stack "text[] - tecnologias utilizadas"
        text external_url "Enlace publico del proyecto"
        text repo_url "Repositorio opcional"
        integer display_order "Orden en grilla y slider"
        cms_content_status status "draft | pending_review | published | archived"
        uuid created_by FK "Ref. auth.users(id)"
        uuid reviewed_by FK "Ref. auth.users(id)"
        timestamptz published_at "Primera publicacion"
        timestamptz created_at "Creacion"
        timestamptz updated_at "Actualizacion automatica"
    }

    CMS_NEWS {
        uuid id PK "gen_random_uuid()"
        varchar title "Titulo opcional si enlaza entidad"
        text description "Extracto opcional si enlaza entidad"
        text image_url "Imagen Storage opcional si enlaza entidad"
        text cta_url "Enlace de detalle ej. /events"
        varchar cta_label "Texto del boton CTA"
        varchar source_type "custom | event | project"
        uuid event_id FK "Ref. opcional cms_events(id)"
        uuid project_id FK "Ref. opcional cms_projects(id)"
        integer display_order "Posicion en carrusel de Home"
        boolean is_active "Interruptor rapido de visibilidad"
        cms_content_status status "draft | pending_review | published | archived"
        uuid created_by FK "Ref. auth.users(id)"
        uuid reviewed_by FK "Ref. auth.users(id)"
        timestamptz published_at "Primera publicacion"
        timestamptz created_at "Creacion"
        timestamptz updated_at "Actualizacion automatica"
    }

    CMS_ALLIANCES {
        uuid id PK "gen_random_uuid()"
        varchar slug UK "Identificador URL amigable"
        varchar name "Nombre oficial de la organizacion aliada"
        text logo_url "Supabase Storage - logo WebP/PNG/SVG"
        text website_url "Sitio web o red oficial opcional"
        numeric logo_scale "Factor visual de escala en marquee"
        integer logo_brightness "Porcentaje de brillo en marquee"
        integer display_order "Orden en marquee"
        boolean is_active "Aliado vigente"
        cms_content_status status "draft | pending_review | published | archived"
        uuid created_by FK "Ref. auth.users(id)"
        uuid reviewed_by FK "Ref. auth.users(id)"
        timestamptz published_at "Primera publicacion"
        timestamptz created_at "Creacion"
        timestamptz updated_at "Actualizacion automatica"
    }

    CMS_METRICS {
        uuid id PK "gen_random_uuid()"
        varchar metric_key UK "Clave unica ej. active_members"
        varchar label "Etiqueta visible ej. Miembros Activos"
        varchar value_text "Valor formateado ej. +70, 3, 4"
        varchar icon_key "members | projects | events | years | alliances | awards"
        integer display_order "Orden en grilla del Home"
        boolean is_active "Metrica visible"
        cms_content_status status "draft | pending_review | published | archived"
        uuid updated_by FK "Ref. auth.users(id)"
        timestamptz published_at "Primera publicacion"
        timestamptz created_at "Creacion"
        timestamptz updated_at "Actualizacion automatica"
    }

    CMS_BOARD_MEMBERS {
        uuid id PK "gen_random_uuid()"
        varchar full_name "Nombre completo visible"
        varchar role_title "Cargo ej. Presidente, Director de ID"
        varchar member_type "president | director | lead"
        varchar area_scope "ALL | ID | ACD | GTH | RRPP | DCC | LGE | FIN"
        text photo_url "Supabase Storage - retrato WebP"
        text linkedin_url "URL completa del perfil LinkedIn"
        text email "Correo normalizado - vinculo logico con recruitment_directors"
        varchar term_period "Gestion ej. 2026"
        integer display_order "Orden dentro de su seccion/area"
        boolean is_active "Miembro vigente en directiva"
        cms_content_status status "draft | pending_review | published | archived"
        uuid created_by FK "Ref. auth.users(id)"
        uuid reviewed_by FK "Ref. auth.users(id)"
        timestamptz published_at "Primera publicacion"
        timestamptz created_at "Creacion"
        timestamptz updated_at "Actualizacion automatica"
    }

    CMS_AUDIT_LOGS {
        uuid id PK "gen_random_uuid()"
        varchar entity_type "cms_events | cms_projects | cms_news | cms_alliances | cms_metrics | cms_board_members"
        uuid entity_id "ID de la entidad auditada"
        varchar action "create | update | submit_review | approve_publish | reject_to_draft | archive"
        uuid actor_id FK "Ref. auth.users(id)"
        varchar area_scope "Area involucrada"
        timestamptz created_at "Marca temporal"
    }

    AUTH_USERS ||--o| CMS_USER_PERMISSIONS : "autoriza perfil"
    AUTH_USERS ||--o{ CMS_PROJECTS : "crea o revisa"
    AUTH_USERS ||--o{ CMS_NEWS : "crea o revisa"
    AUTH_USERS ||--o{ CMS_ALLIANCES : "crea o revisa"
    AUTH_USERS ||--o{ CMS_METRICS : "actualiza"
    AUTH_USERS ||--o{ CMS_BOARD_MEMBERS : "crea o revisa"
    AUTH_USERS ||--o{ CMS_AUDIT_LOGS : "ejecuta accion"

    CMS_EVENTS |o--o{ CMS_NEWS : "destaca evento (event_id)"
    CMS_PROJECTS |o--o{ CMS_NEWS : "destaca proyecto (project_id)"
    RECRUITMENT_DIRECTORS |o--o| CMS_BOARD_MEMBERS : "vinculo logico por email"

    CMS_PROJECTS ||--o{ CMS_AUDIT_LOGS : "trazabilidad (entity_id)"
    CMS_NEWS ||--o{ CMS_AUDIT_LOGS : "trazabilidad (entity_id)"
    CMS_ALLIANCES ||--o{ CMS_AUDIT_LOGS : "trazabilidad (entity_id)"
    CMS_METRICS ||--o{ CMS_AUDIT_LOGS : "trazabilidad (entity_id)"
    CMS_BOARD_MEMBERS ||--o{ CMS_AUDIT_LOGS : "trazabilidad (entity_id)"
```

---

## 12. Diccionario de Datos Detallado y Mapeo hacia Astro (`src/`)

### 12.1 Matriz de Permisos Editoriales para Prioridad 2

| Tabla | `admin` (`ALL`) | `dcc` (`ALL`) | `director` (`<AREA>`) | `delegate` (`<AREA>`) |
| :--- | :--- | :--- | :--- | :--- |
| **`cms_projects`** | 1 paso en todas las áreas | 1 paso en todas las áreas | 1 paso + aprobador en su `area_scope` | 2 pasos (`draft` ↔ `pending_review`) en su `area_scope` |
| **`cms_news`** | 1 paso | 1 paso | Solo lectura pública | Solo lectura pública |
| **`cms_alliances`** | 1 paso | 1 paso | 1 paso + aprobador solo si `area_scope = 'RRPP'` | 2 pasos (`draft` ↔ `pending_review`) solo si `area_scope = 'RRPP'` |
| **`cms_metrics`** | 1 paso | 1 paso | Solo lectura pública | Solo lectura pública |
| **`cms_board_members`** | 1 paso (`president`, `director`, `lead`) | 1 paso (`president`, `director`, `lead`) | 1 paso + aprobador en su `area_scope` solo para `member_type IN ('director', 'lead')` | Solo lectura pública |

### 12.2 Tabla `public.cms_projects`

Sustituye la fuente estática `src/data/projects.ts` manteniendo el 100% de compatibilidad con `src/pages/projects.astro`, `project-card.astro`, `project-modal.astro`, `project-filters.astro`, `featured-project-card.astro`, `area-project-card.astro` y `area-project-slider.astro`.

| Columna | Tipo de dato | Restricciones (Constraints) | Descripción (Propósito y Consumo en Frontend) |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Identificador único del proyecto. |
| `slug` | `varchar(160)` | `UNIQUE NOT NULL`, `CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')` | Identificador URL amigable (usado en rutas como `/projects/<slug>`). |
| `title` | `varchar(200)` | `NOT NULL` | Título principal del proyecto. |
| `description` | `text` | `NOT NULL` | Descripción resumida mostrada en `project-card.astro` y `area-project-card.astro` (`line-clamp-3`). |
| `long_description` | `text` | `NULL` | Descripción extendida mostrada en el modal (`project-modal.astro` usa `longDescription \|\| description`). |
| `project_status` | `varchar(20)` | `NOT NULL DEFAULT 'Active'`, `CHECK (project_status IN ('Active', 'Inactive'))` | Estado operativo del proyecto (badge verde `"Active"` o rojo `"Inactive"` en la esquina superior derecha de la tarjeta; independiente del `status` editorial del CMS). |
| `area_scope` | `varchar(20)` | `NOT NULL`, `CHECK (area_scope IN ('ALL', 'ID', 'ACD', 'GTH', 'RRPP', 'DCC', 'LGE', 'FIN'))` | Área propietaria del proyecto para filtros (`data-area` en minúsculas en `projects.astro` y `/areas/*.astro`) y autorización RLS por área. |
| `faculty_badge` | `varchar(40)` | `NOT NULL` | Etiqueta corta mostrada junto al icono en la parte inferior izquierda de `project-card.astro` (en `projects.ts` corresponde a `faculty`, ej. `'ID'`, `'DCC'`, `'ACD'`, que puede diferir de `area_scope`). |
| `category` | `varchar(60)` | `NULL` | Etiqueta de categoría/píldora mostrada en `featured-project-card.astro` (ej. `'Destacado'`). |
| `is_featured` | `boolean` | `NOT NULL DEFAULT false` | Indica si el proyecto aparece en el carrusel `FeaturedSection` de `/projects`. |
| `thumbnail_url` | `text` | `NOT NULL` | URL pública en Supabase Storage (WebP) para `Project.image` en tarjetas y slider de destacados. |
| `image_position` | `varchar(30)` | `NOT NULL DEFAULT 'center'`, `CHECK (image_position IN ('center', 'top', 'bottom', 'left', 'right'))` | Posicionamiento CSS (`object-${imagePosition}` / `bg-${imagePosition}`) en `project-card.astro` y `featured-project-card.astro`. |
| `screenshots` | `text[]` | `NOT NULL DEFAULT '{}'::text[]` | Lista de URLs de capturas en Supabase Storage consumidas por el layout adaptable (0, 1 o 2+ columnas) en `project-modal.astro`. |
| `team` | `jsonb` | `NOT NULL DEFAULT '[]'::jsonb`, `CHECK (jsonb_typeof(team) = 'array')` | Arreglo JSONB de integrantes del proyecto. Contrato de cada elemento: `{ "name": string, "linkedin": string, "image": string, "role"?: string }`. |
| `tech_stack` | `text[]` | `NOT NULL DEFAULT '{}'::text[]` | Lista opcional de tecnologías utilizadas en el proyecto (ej. `{'Astro', 'TypeScript', 'Supabase'}`). |
| `external_url` | `text` | `NULL` | Enlace principal del proyecto (botón `"Click aquí para conocer <title>"` en `project-modal.astro` y `href` en `news.astro`). |
| `repo_url` | `text` | `NULL` | Enlace opcional al repositorio de código fuente (GitHub). |
| `display_order` | `integer` | `NOT NULL DEFAULT 0` | Orden de presentación manual en destacados y grilla. |
| `status` | `cms_content_status` | `NOT NULL DEFAULT 'draft'` | Estado del ciclo de vida editorial (`'draft'`, `'pending_review'`, `'published'`, `'archived'`). |
| `created_by` | `uuid` | `NULL`, FK → `auth.users(id) ON DELETE SET NULL` | Usuario creador del registro. |
| `reviewed_by` | `uuid` | `NULL`, FK → `auth.users(id) ON DELETE SET NULL` | Director, DCC o Admin que aprobó la publicación. |
| `published_at` | `timestamptz` | `NULL` | Marca temporal de primera publicación (sellada por trigger). |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Fecha y hora de creación. |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Fecha y hora de última modificación (actualizada vía trigger). |

> **Nota sobre `team[].linkedin` en `project-modal.astro`:** El modal actual construye `https://linkedin.com/in/${member.linkedin}` concatenando un slug. Al migrar desde `src/data/projects.ts` o editar desde el CMS, conviene normalizar en frontend para aceptar tanto el slug (`"alexisgarayyovera"`) como la URL completa (`"https://www.linkedin.com/in/..."`).

### 12.3 Tabla `public.cms_news`

Permite a **Admin** y **DCC** curar manualmente las tarjetas del carrusel **Novedades** del Home (`src/components/components-home/news.astro`), ya sea enlazando un evento existente (`event_id`), un proyecto existente (`project_id`) o redactando una novedad personalizada (`source_type = 'custom'`).

| Columna | Tipo de dato | Restricciones (Constraints) | Descripción (Propósito) |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Identificador único de la tarjeta de novedad. |
| `title` | `varchar(200)` | `NULL` (obligatorio si `source_type = 'custom'`) | Título de la tarjeta (`NewsCard.title`). Si es `NULL` y enlaza `event_id`/`project_id`, la vista pública hereda el título de la entidad vinculada. |
| `description` | `text` | `NULL` (obligatorio si `source_type = 'custom'`) | Texto descriptivo de la tarjeta (`NewsCard.description`). Hereda `summary`/`description` si enlaza entidad. |
| `image_url` | `text` | `NULL` (obligatorio si `source_type = 'custom'`) | Miniatura en Supabase Storage (`NewsCard.image`). Hereda `thumbnail_url` si enlaza entidad. |
| `cta_url` | `text` | `NULL` | URL de destino del botón (`NewsCard.href`). Hereda `external_url` o usa `'/events'` / `'/projects'` como respaldo. |
| `cta_label` | `varchar(60)` | `NOT NULL DEFAULT 'Ver detalles'` | Etiqueta del botón en `news-card.astro`. |
| `source_type` | `varchar(20)` | `NOT NULL DEFAULT 'custom'`, `CHECK (source_type IN ('custom', 'event', 'project'))` | Origen de la novedad. |
| `event_id` | `uuid` | `NULL`, FK → `public.cms_events(id) ON DELETE CASCADE` | Referencia opcional al evento destacado. |
| `project_id` | `uuid` | `NULL`, FK → `public.cms_projects(id) ON DELETE CASCADE` | Referencia opcional al proyecto destacado. |
| `display_order` | `integer` | `NOT NULL DEFAULT 0` | Posición ascendente en el carrusel del Home. |
| `is_active` | `boolean` | `NOT NULL DEFAULT true` | Habilita o pausa la aparición de la novedad sin archivarla. |
| `status` | `cms_content_status` | `NOT NULL DEFAULT 'draft'` | Estado del ciclo de vida editorial. |
| `created_by` | `uuid` | `NULL`, FK → `auth.users(id) ON DELETE SET NULL` | Usuario creador. |
| `reviewed_by` | `uuid` | `NULL`, FK → `auth.users(id) ON DELETE SET NULL` | Revisor/aprobador. |
| `published_at` | `timestamptz` | `NULL` | Marca temporal de publicación. |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Fecha de creación. |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Última modificación. |

- **Restricción de consistencia (`chk_cms_news_source_consistency`):**
  - `source_type = 'custom'` → `event_id IS NULL AND project_id IS NULL` y exige `title`, `description` e `image_url` no vacíos.
  - `source_type = 'event'` → `event_id IS NOT NULL AND project_id IS NULL`.
  - `source_type = 'project'` → `project_id IS NOT NULL AND event_id IS NULL`.

### 12.4 Tabla `public.cms_alliances`

Sustituye la lectura estática por `import.meta.glob` en `src/components/components-home/alliances.astro` y almacena explícitamente las propiedades de normalización visual que antes dependían del nombre del archivo.

| Columna | Tipo de dato | Restricciones (Constraints) | Descripción (Propósito) |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Identificador único de la alianza. |
| `slug` | `varchar(160)` | `UNIQUE NOT NULL`, `CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')` | Identificador único legible (ej. `data-science-research-peru`). |
| `name` | `varchar(150)` | `NOT NULL` | Nombre oficial mostrado en `alt`, `title` y tooltip flotante del marquee. |
| `logo_url` | `text` | `NOT NULL` | Ruta pública del logotipo en Supabase Storage. |
| `website_url` | `text` | `NULL` | Sitio web o red oficial de la organización aliada (opcional). |
| `logo_scale` | `numeric(4,2)` | `NOT NULL DEFAULT 1.00`, `CHECK (logo_scale BETWEEN 0.50 AND 3.50)` | Factor de escala visual para equilibrar proporciones de logos en `alliances.astro` (ej. `0.85`, `1.80`, `2.80`). |
| `logo_brightness` | `integer` | `NOT NULL DEFAULT 200`, `CHECK (logo_brightness BETWEEN 50 AND 300)` | Porcentaje de brillo CSS aplicado en estado inactivo del marquee (ej. `200`, `250`). |
| `display_order` | `integer` | `NOT NULL DEFAULT 0` | Orden de aparición en las filas del marquee. |
| `is_active` | `boolean` | `NOT NULL DEFAULT true` | Indica si el convenio/alianza se encuentra vigente. |
| `status` | `cms_content_status` | `NOT NULL DEFAULT 'draft'` | Estado del ciclo de vida editorial (administrado por `admin`, `dcc` y `RRPP`). |
| `created_by` | `uuid` | `NULL`, FK → `auth.users(id) ON DELETE SET NULL` | Usuario creador. |
| `reviewed_by` | `uuid` | `NULL`, FK → `auth.users(id) ON DELETE SET NULL` | Director de RRPP, DCC o Admin aprobador. |
| `published_at` | `timestamptz` | `NULL` | Fecha de primera publicación. |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Fecha de creación. |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Última modificación. |

### 12.5 Tabla `public.cms_metrics`

Administra los indicadores de impacto mostrados en la sección **Cifras que nos definen** (`src/components/components-home/stats.astro`).

| Columna | Tipo de dato | Restricciones (Constraints) | Descripción (Propósito) |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Identificador único del indicador. |
| `metric_key` | `varchar(60)` | `UNIQUE NOT NULL`, `CHECK (metric_key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$')` | Clave semántica estable (ej. `active_members`, `completed_projects`, `events_held`, `years_experience`). |
| `label` | `varchar(100)` | `NOT NULL` | Etiqueta descriptiva mostrada bajo la cifra (ej. `"Miembros Activos"`). |
| `value_text` | `varchar(30)` | `NOT NULL` | Valor formateado para renderizado directo en `stats.astro` (ej. `"+70"`, `"3"`, `"4"`, `"1"`). |
| `icon_key` | `varchar(40)` | `NOT NULL DEFAULT 'members'`, `CHECK (icon_key IN ('members', 'projects', 'events', 'years', 'alliances', 'awards'))` | Selector del icono SVG en `stats.astro` (`"members"`, `"projects"`, `"events"`, `"years"`, etc.). |
| `display_order` | `integer` | `NOT NULL DEFAULT 0` | Orden de las tarjetas en la grilla del Home. |
| `is_active` | `boolean` | `NOT NULL DEFAULT true` | Visibilidad pública del indicador. |
| `status` | `cms_content_status` | `NOT NULL DEFAULT 'published'` | Estado editorial del indicador. |
| `updated_by` | `uuid` | `NULL`, FK → `auth.users(id) ON DELETE SET NULL` | Último administrador o miembro DCC que actualizó la métrica. |
| `published_at` | `timestamptz` | `NULL` | Fecha de primera publicación. |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Fecha de creación. |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Última actualización. |

### 12.6 Tabla `public.cms_board_members`

Centraliza los perfiles mostrados en `src/components/components-home/presidents.astro` y en la sección de directores de cada página en `src/pages/areas/*.astro` (`area-director-profile.astro`).

| Columna | Tipo de dato | Restricciones (Constraints) | Descripción (Propósito) |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Identificador único del miembro directivo. |
| `full_name` | `varchar(150)` | `NOT NULL` | Nombre completo visible en la ficha (`presidents.astro` y `area-director-profile.astro`). |
| `role_title` | `varchar(100)` | `NOT NULL` | Cargo descriptivo (ej. `"Presidente"`, `"Director de ID"`, `"Encargada de DCC"`). |
| `member_type` | `varchar(20)` | `NOT NULL`, `CHECK (member_type IN ('president', 'director', 'lead'))` | Clasificación jerárquica para renderizar Home (`'president'`) o páginas de área (`'director'`, `'lead'`). |
| `area_scope` | `varchar(20)` | `NOT NULL`, `CHECK (area_scope IN ('ALL', 'ID', 'ACD', 'GTH', 'RRPP', 'DCC', 'LGE', 'FIN'))` | Área asociada. Consistencia (`chk_cms_board_member_scope`): `'president'` requiere `area_scope = 'ALL'`; `'director'` y `'lead'` requieren un área específica (`area_scope <> 'ALL'`). |
| `photo_url` | `text` | `NOT NULL` | URL pública de retrato WebP en Supabase Storage (`imageSrc` en `area-director-profile.astro`). |
| `linkedin_url` | `text` | `NULL` | URL completa del perfil profesional en LinkedIn (`https://www.linkedin.com/in/...`). |
| `email` | `text` | `NULL`, `CHECK (email IS NULL OR (email = lower(email) AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'))` | Correo institucional/personal normalizado para **articulación lógica con `public.recruitment_directors(email)`**. Protegido mediante privilegios de columna para no exponerse a `anon`. |
| `term_period` | `varchar(20)` | `NULL` | Periodo de gestión (ej. `"2026"`). |
| `display_order` | `integer` | `NOT NULL DEFAULT 0` | Orden de visualización dentro de Presidencia o dentro del área. |
| `is_active` | `boolean` | `NOT NULL DEFAULT true` | Indica si el miembro pertenece a la directiva vigente. |
| `status` | `cms_content_status` | `NOT NULL DEFAULT 'draft'` | Estado del ciclo de vida editorial. |
| `created_by` | `uuid` | `NULL`, FK → `auth.users(id) ON DELETE SET NULL` | Usuario creador. |
| `reviewed_by` | `uuid` | `NULL`, FK → `auth.users(id) ON DELETE SET NULL` | Usuario aprobador. |
| `published_at` | `timestamptz` | `NULL` | Fecha de primera publicación. |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Fecha de creación. |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Última modificación. |

#### Articulación Lógica con `public.recruitment_directors` (Por qué NO usar Foreign Key física)

1. **Desacoplamiento operativo:** `public.recruitment_directors(email, area, name)` almacena exclusivamente las cuentas con permiso de acceso al flujo de evaluación de postulaciones (gestionadas por GTH mediante `recruitment_director_save` y `recruitment_director_remove` en `20261013_recruitment_director_individual.sql`). Los **Presidentes** (`member_type = 'president'`) o exdirectivos archivados no necesariamente participan en la tabla de reclutamiento.
2. **Integridad sin bloqueos:** Si GTH revoca a un evaluador en `recruitment_directors` al finalizar una convocatoria, una clave foránea física impediría el `DELETE` (`RESTRICT`) o eliminaría el perfil público del sitio (`CASCADE`). El vínculo lógico por `LOWER(email)` + índice único parcial (`idx_cms_board_members_active_email`) permite sincronizar nombres, áreas y altas desde el panel administrativo sin acoplamiento destructivo.
3. **Privacidad:** El correo operativo en `recruitment_directors` nunca es público. Por ello, la columna `cms_board_members.email` tiene revocado el permiso `SELECT` para el rol `anon` y es excluida de la vista pública `cms_public_board_members`.

### 12.7 Mapeo Consolidado Base de Datos → Componentes Astro (`src/`)

| Componente / Archivo Actual en `src/` | Propiedad Actual | Origen en Base de Datos (`cms_*` / Vista Pública) |
| :--- | :--- | :--- |
| `src/data/projects.ts` / `project-card.astro` | `title`, `description`, `status`, `faculty`, `image`, `imagePosition`, `area` | `cms_public_projects`: `title`, `description`, `project_status`, `faculty_badge`, `thumbnail_url`, `image_position`, `area` (`lower(area_scope)`) |
| `featured-project-card.astro` | `title`, `category`, `image`, `imagePosition` | `cms_public_projects` (`WHERE is_featured = true`): `title`, `COALESCE(category, 'Destacado')`, `thumbnail_url`, `image_position` |
| `project-modal.astro` | `title`, `longDescription`, `screenshots[]`, `team[]`, `link` | `cms_public_projects`: `title`, `long_description`, `screenshots`, `team`, `external_url` |
| `src/components/components-home/news.astro` & `news-card.astro` | `title`, `description`, `image`, `href` | `cms_public_news` (`LIMIT 5`): `title`, `description`, `image_url`, `cta_url` |
| `src/components/components-home/alliances.astro` | `name`, `logo`, `scale`, `brightness` | `cms_public_alliances`: `name`, `logo_url`, `logo_scale`, `logo_brightness` |
| `src/components/components-home/stats.astro` | `icon`, `value`, `label` | `cms_public_metrics`: `icon_key`, `value_text`, `label` |
| `src/components/components-home/presidents.astro` | Nombre, foto, LinkedIn | `cms_public_board_members` (`WHERE member_type = 'president'`): `full_name`, `photo_url`, `linkedin_url` |
| `src/pages/areas/*.astro` & `area-director-profile.astro` | `directors[].name`, `linkedin`, `imageSrc` | `cms_public_board_members` (`WHERE member_type IN ('director', 'lead') AND area_scope = '<AREA>'`): `full_name`, `linkedin_url`, `photo_url` |

---

## 13. Vistas SQL de Lectura Pública (`security_invoker = true`)

Para hidratar las páginas públicas de Astro en SSR/SSG con consultas mínimas (`LCP < 2.5s`) y garantizando que **nunca se filtren borradores (`draft`), revisiones pendientes (`pending_review`), archivados (`archived`) ni correos privados**, se definen seis vistas públicas en PostgreSQL 15+ con `WITH (security_invoker = true)`. Al activar `security_invoker = true`, cada vista evalúa las políticas RLS usando los permisos del rol invocante (`anon` o `authenticated`) y no los del propietario creador de la vista.

| Vista Pública | Tabla(s) Fuente | Filtro Público Obligatorio | Ordenamiento Predeterminado | Notas de Diseño |
| :--- | :--- | :--- | :--- | :--- |
| `public.cms_public_events` | `cms_events` | `status = 'published'` | `is_featured DESC, event_date DESC` | Calcula `is_upcoming` en tiempo real comparando `COALESCE(end_date, event_date) >= now()`. |
| `public.cms_public_projects` | `cms_projects` | `status = 'published'` | `is_featured DESC, display_order ASC, published_at DESC` | Expone `lower(area_scope) AS area` para mantener compatibilidad con `project-filters.astro` y `/areas/*.astro`. |
| `public.cms_public_news` | `cms_news`, `cms_events`, `cms_projects` | `n.status = 'published' AND n.is_active = true` + entidad referenciada publicada | `n.display_order ASC, n.published_at DESC` | Resuelve dinámicamente título, descripción, imagen y enlace mediante `COALESCE` y oculta referencias si el evento/proyecto enlazado deja de estar `'published'`. |
| `public.cms_public_alliances` | `cms_alliances` | `status = 'published' AND is_active = true` | `display_order ASC, name ASC` | Entrega factores de normalización (`logo_scale`, `logo_brightness`) junto a `logo_url`. |
| `public.cms_public_metrics` | `cms_metrics` | `status = 'published' AND is_active = true` | `display_order ASC, metric_key ASC` | Entrega exactamente los campos consumidos por `stats.astro`. |
| `public.cms_public_board_members` | `cms_board_members` | `status = 'published' AND is_active = true` | Jerarquía (`president` → `director` → `lead`), `area_scope`, `display_order ASC` | **Omite explícitamente la columna `email`** para evitar exposición pública de correos vinculados a `recruitment_directors`. |

### Ejemplo de Consumo Tipado en Astro (SSR / Build)

```typescript
// Ejemplo de hidratación en src/pages/projects.astro o src/pages/index.astro
const [
  { data: projects },
  { data: news },
  { data: alliances },
  { data: metrics },
  { data: boardMembers },
] = await Promise.all([
  supabase.from('cms_public_projects').select('*'),
  supabase.from('cms_public_news').select('*').limit(5),
  supabase.from('cms_public_alliances').select('*'),
  supabase.from('cms_public_metrics').select('*'),
  supabase.from('cms_public_board_members').select('*'),
]);
```

---

## 14. Script SQL Preliminar DDL — Entrega 2 (PostgreSQL / Supabase)

> **Prerrequisito:** Haber ejecutado previamente el script de la **Sección 10 (Entrega 1)**, que crea `public.cms_content_status`, `public.cms_user_permissions`, `public.cms_events`, `public.cms_audit_logs`, `public.cms_set_updated_at()`, `public.cms_sync_published_at()` y `public.cms_current_permission()`.

```sql
-- ============================================================================
-- CMS UNICODE — ENTREGA 2 (Proyectos, Novedades, Alianzas, Métricas, Directiva)
-- Script DDL preliminar idempotente para PostgreSQL 15+ / Supabase
-- Nota: Mantiene intactas `applicants` y todas las tablas `recruitment_*`.
-- ============================================================================

-- 1. Tabla de Proyectos (`cms_projects`)
CREATE TABLE IF NOT EXISTS public.cms_projects (
    id               uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
    slug             varchar(160)              NOT NULL UNIQUE
                                               CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    title            varchar(200)              NOT NULL,
    description      text                      NOT NULL,
    long_description text                      NULL,
    project_status   varchar(20)               NOT NULL DEFAULT 'Active'
                                               CHECK (project_status IN ('Active', 'Inactive')),
    area_scope       varchar(20)               NOT NULL
                                               CHECK (area_scope IN ('ALL', 'ID', 'ACD', 'GTH', 'RRPP', 'DCC', 'LGE', 'FIN')),
    faculty_badge    varchar(40)               NOT NULL,
    category         varchar(60)               NULL,
    is_featured      boolean                   NOT NULL DEFAULT false,
    thumbnail_url    text                      NOT NULL,
    image_position   varchar(30)               NOT NULL DEFAULT 'center'
                                               CHECK (image_position IN ('center', 'top', 'bottom', 'left', 'right')),
    screenshots      text[]                    NOT NULL DEFAULT '{}'::text[],
    team             jsonb                     NOT NULL DEFAULT '[]'::jsonb
                                               CHECK (jsonb_typeof(team) = 'array'),
    tech_stack       text[]                    NOT NULL DEFAULT '{}'::text[],
    external_url     text                      NULL,
    repo_url         text                      NULL,
    display_order    integer                   NOT NULL DEFAULT 0,
    status           public.cms_content_status NOT NULL DEFAULT 'draft',
    created_by       uuid                      NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_by      uuid                      NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    published_at     timestamptz               NULL,
    created_at       timestamptz               NOT NULL DEFAULT now(),
    updated_at       timestamptz               NOT NULL DEFAULT now()
);

-- 2. Tabla de Novedades del Home (`cms_news`)
CREATE TABLE IF NOT EXISTS public.cms_news (
    id            uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
    title         varchar(200)              NULL,
    description   text                      NULL,
    image_url     text                      NULL,
    cta_url       text                      NULL,
    cta_label     varchar(60)               NOT NULL DEFAULT 'Ver detalles',
    source_type   varchar(20)               NOT NULL DEFAULT 'custom'
                                            CHECK (source_type IN ('custom', 'event', 'project')),
    event_id      uuid                      NULL REFERENCES public.cms_events(id) ON DELETE CASCADE,
    project_id    uuid                      NULL REFERENCES public.cms_projects(id) ON DELETE CASCADE,
    display_order integer                   NOT NULL DEFAULT 0,
    is_active     boolean                   NOT NULL DEFAULT true,
    status        public.cms_content_status NOT NULL DEFAULT 'draft',
    created_by    uuid                      NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_by   uuid                      NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    published_at  timestamptz               NULL,
    created_at    timestamptz               NOT NULL DEFAULT now(),
    updated_at    timestamptz               NOT NULL DEFAULT now(),

    CONSTRAINT chk_cms_news_source_consistency CHECK (
        (
            source_type = 'custom'
            AND event_id IS NULL
            AND project_id IS NULL
            AND length(trim(coalesce(title, ''))) > 0
            AND length(trim(coalesce(description, ''))) > 0
            AND length(trim(coalesce(image_url, ''))) > 0
        )
        OR (source_type = 'event' AND event_id IS NOT NULL AND project_id IS NULL)
        OR (source_type = 'project' AND project_id IS NOT NULL AND event_id IS NULL)
    )
);

-- 3. Tabla de Alianzas (`cms_alliances`)
CREATE TABLE IF NOT EXISTS public.cms_alliances (
    id              uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            varchar(160)              NOT NULL UNIQUE
                                              CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    name            varchar(150)              NOT NULL,
    logo_url        text                      NOT NULL,
    website_url     text                      NULL,
    logo_scale      numeric(4,2)              NOT NULL DEFAULT 1.00
                                              CHECK (logo_scale BETWEEN 0.50 AND 3.50),
    logo_brightness integer                   NOT NULL DEFAULT 200
                                              CHECK (logo_brightness BETWEEN 50 AND 300),
    display_order   integer                   NOT NULL DEFAULT 0,
    is_active       boolean                   NOT NULL DEFAULT true,
    status          public.cms_content_status NOT NULL DEFAULT 'draft',
    created_by      uuid                      NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_by     uuid                      NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    published_at    timestamptz               NULL,
    created_at      timestamptz               NOT NULL DEFAULT now(),
    updated_at      timestamptz               NOT NULL DEFAULT now()
);

-- 4. Tabla de Métricas del Home (`cms_metrics`)
CREATE TABLE IF NOT EXISTS public.cms_metrics (
    id            uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_key    varchar(60)               NOT NULL UNIQUE
                                            CHECK (metric_key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
    label         varchar(100)              NOT NULL,
    value_text    varchar(30)               NOT NULL,
    icon_key      varchar(40)               NOT NULL DEFAULT 'members'
                                            CHECK (icon_key IN ('members', 'projects', 'events', 'years', 'alliances', 'awards')),
    display_order integer                   NOT NULL DEFAULT 0,
    is_active     boolean                   NOT NULL DEFAULT true,
    status        public.cms_content_status NOT NULL DEFAULT 'published',
    updated_by    uuid                      NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    published_at  timestamptz               NULL,
    created_at    timestamptz               NOT NULL DEFAULT now(),
    updated_at    timestamptz               NOT NULL DEFAULT now()
);

-- 5. Tabla de Presidentes y Directores/Encargados (`cms_board_members`)
CREATE TABLE IF NOT EXISTS public.cms_board_members (
    id            uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name     varchar(150)              NOT NULL,
    role_title    varchar(100)              NOT NULL,
    member_type   varchar(20)               NOT NULL
                                            CHECK (member_type IN ('president', 'director', 'lead')),
    area_scope    varchar(20)               NOT NULL
                                            CHECK (area_scope IN ('ALL', 'ID', 'ACD', 'GTH', 'RRPP', 'DCC', 'LGE', 'FIN')),
    photo_url     text                      NOT NULL,
    linkedin_url  text                      NULL,
    email         text                      NULL
                                            CHECK (email IS NULL OR (email = lower(email) AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
    term_period   varchar(20)               NULL,
    display_order integer                   NOT NULL DEFAULT 0,
    is_active     boolean                   NOT NULL DEFAULT true,
    status        public.cms_content_status NOT NULL DEFAULT 'draft',
    created_by    uuid                      NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_by   uuid                      NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    published_at  timestamptz               NULL,
    created_at    timestamptz               NOT NULL DEFAULT now(),
    updated_at    timestamptz               NOT NULL DEFAULT now(),

    CONSTRAINT chk_cms_board_member_scope CHECK (
        (member_type = 'president' AND area_scope = 'ALL')
        OR
        (member_type IN ('director', 'lead') AND area_scope <> 'ALL')
    )
);

-- 6. Índices optimizados para consultas públicas y flujos editoriales
CREATE INDEX IF NOT EXISTS idx_cms_projects_public_listing
    ON public.cms_projects (is_featured DESC, display_order ASC, published_at DESC)
    WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_cms_projects_area_scope
    ON public.cms_projects (area_scope, status);

CREATE INDEX IF NOT EXISTS idx_cms_news_public_listing
    ON public.cms_news (display_order ASC, published_at DESC)
    WHERE status = 'published' AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_cms_news_event_id
    ON public.cms_news (event_id)
    WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cms_news_project_id
    ON public.cms_news (project_id)
    WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cms_alliances_public_listing
    ON public.cms_alliances (display_order ASC, name ASC)
    WHERE status = 'published' AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_cms_metrics_public_listing
    ON public.cms_metrics (display_order ASC, metric_key ASC)
    WHERE status = 'published' AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_cms_board_members_public_listing
    ON public.cms_board_members (member_type, area_scope, display_order ASC)
    WHERE status = 'published' AND is_active = true;

-- Garantiza unicidad de correo activo para vinculación lógica con `recruitment_directors`
CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_board_members_active_email
    ON public.cms_board_members (email)
    WHERE email IS NOT NULL AND is_active = true;

-- 7. Triggers automáticos (`updated_at` y `published_at`)
DROP TRIGGER IF EXISTS trg_cms_projects_updated_at ON public.cms_projects;
CREATE TRIGGER trg_cms_projects_updated_at
    BEFORE UPDATE ON public.cms_projects
    FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();

DROP TRIGGER IF EXISTS trg_cms_projects_published_at ON public.cms_projects;
CREATE TRIGGER trg_cms_projects_published_at
    BEFORE INSERT OR UPDATE ON public.cms_projects
    FOR EACH ROW EXECUTE FUNCTION public.cms_sync_published_at();

DROP TRIGGER IF EXISTS trg_cms_news_updated_at ON public.cms_news;
CREATE TRIGGER trg_cms_news_updated_at
    BEFORE UPDATE ON public.cms_news
    FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();

DROP TRIGGER IF EXISTS trg_cms_news_published_at ON public.cms_news;
CREATE TRIGGER trg_cms_news_published_at
    BEFORE INSERT OR UPDATE ON public.cms_news
    FOR EACH ROW EXECUTE FUNCTION public.cms_sync_published_at();

DROP TRIGGER IF EXISTS trg_cms_alliances_updated_at ON public.cms_alliances;
CREATE TRIGGER trg_cms_alliances_updated_at
    BEFORE UPDATE ON public.cms_alliances
    FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();

DROP TRIGGER IF EXISTS trg_cms_alliances_published_at ON public.cms_alliances;
CREATE TRIGGER trg_cms_alliances_published_at
    BEFORE INSERT OR UPDATE ON public.cms_alliances
    FOR EACH ROW EXECUTE FUNCTION public.cms_sync_published_at();

DROP TRIGGER IF EXISTS trg_cms_metrics_updated_at ON public.cms_metrics;
CREATE TRIGGER trg_cms_metrics_updated_at
    BEFORE UPDATE ON public.cms_metrics
    FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();

DROP TRIGGER IF EXISTS trg_cms_metrics_published_at ON public.cms_metrics;
CREATE TRIGGER trg_cms_metrics_published_at
    BEFORE INSERT OR UPDATE ON public.cms_metrics
    FOR EACH ROW EXECUTE FUNCTION public.cms_sync_published_at();

DROP TRIGGER IF EXISTS trg_cms_board_members_updated_at ON public.cms_board_members;
CREATE TRIGGER trg_cms_board_members_updated_at
    BEFORE UPDATE ON public.cms_board_members
    FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();

DROP TRIGGER IF EXISTS trg_cms_board_members_published_at ON public.cms_board_members;
CREATE TRIGGER trg_cms_board_members_published_at
    BEFORE INSERT OR UPDATE ON public.cms_board_members
    FOR EACH ROW EXECUTE FUNCTION public.cms_sync_published_at();

-- 8. Seguridad a Nivel de Fila (RLS obligatorio) y Privilegios por Columna
ALTER TABLE public.cms_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_alliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_board_members ENABLE ROW LEVEL SECURITY;

-- Proteger la columna `email` de `cms_board_members` frente a consultas REST directas con anon y authenticated
REVOKE ALL ON TABLE public.cms_board_members FROM public, anon, authenticated;
GRANT SELECT (
    id,
    full_name,
    role_title,
    member_type,
    area_scope,
    photo_url,
    linkedin_url,
    term_period,
    display_order,
    is_active,
    status,
    published_at,
    created_at,
    updated_at
) ON public.cms_board_members TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.cms_board_members TO authenticated;

-- 8.1 Políticas para `cms_projects` (flujo editorial dual por área)
DROP POLICY IF EXISTS "Lectura publica de proyectos publicados" ON public.cms_projects;
CREATE POLICY "Lectura publica de proyectos publicados"
    ON public.cms_projects
    FOR SELECT
    TO anon, authenticated
    USING (status = 'published');

DROP POLICY IF EXISTS "Lectura editorial de proyectos segun ambito" ON public.cms_projects;
CREATE POLICY "Lectura editorial de proyectos segun ambito"
    ON public.cms_projects
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE cp.area_scope = 'ALL'
               OR cp.area_scope = cms_projects.area_scope
        )
    );

DROP POLICY IF EXISTS "Creacion de proyectos segun flujo dual y area" ON public.cms_projects;
CREATE POLICY "Creacion de proyectos segun flujo dual y area"
    ON public.cms_projects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE (cp.role IN ('admin', 'dcc') AND cp.area_scope = 'ALL')
               OR (cp.role = 'director' AND cp.area_scope = cms_projects.area_scope)
               OR (
                   cp.role = 'delegate'
                   AND cp.area_scope = cms_projects.area_scope
                   AND cms_projects.status IN ('draft', 'pending_review')
               )
        )
    );

DROP POLICY IF EXISTS "Actualizacion de proyectos segun flujo dual y area" ON public.cms_projects;
CREATE POLICY "Actualizacion de proyectos segun flujo dual y area"
    ON public.cms_projects
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE (cp.role IN ('admin', 'dcc') AND cp.area_scope = 'ALL')
               OR (cp.role = 'director' AND cp.area_scope = cms_projects.area_scope)
               OR (
                   cp.role = 'delegate'
                   AND cp.area_scope = cms_projects.area_scope
                   AND cms_projects.status IN ('draft', 'pending_review')
               )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE (cp.role IN ('admin', 'dcc') AND cp.area_scope = 'ALL')
               OR (cp.role = 'director' AND cp.area_scope = cms_projects.area_scope)
               OR (
                   cp.role = 'delegate'
                   AND cp.area_scope = cms_projects.area_scope
                   AND cms_projects.status IN ('draft', 'pending_review')
               )
        )
    );

DROP POLICY IF EXISTS "Eliminacion de proyectos restringida a Admin global" ON public.cms_projects;
CREATE POLICY "Eliminacion de proyectos restringida a Admin global"
    ON public.cms_projects
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE cp.role = 'admin' AND cp.area_scope = 'ALL'
        )
    );

-- 8.2 Políticas para `cms_news` (Admin y DCC)
DROP POLICY IF EXISTS "Lectura publica de novedades activas y publicadas" ON public.cms_news;
CREATE POLICY "Lectura publica de novedades activas y publicadas"
    ON public.cms_news
    FOR SELECT
    TO anon, authenticated
    USING (status = 'published' AND is_active = true);

DROP POLICY IF EXISTS "Gestion editorial de novedades para Admin y DCC" ON public.cms_news;
CREATE POLICY "Gestion editorial de novedades para Admin y DCC"
    ON public.cms_news
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE cp.role IN ('admin', 'dcc') AND cp.area_scope = 'ALL'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE cp.role IN ('admin', 'dcc') AND cp.area_scope = 'ALL'
        )
    );

-- 8.3 Políticas para `cms_alliances` (Admin, DCC y área RRPP)
DROP POLICY IF EXISTS "Lectura publica de alianzas activas y publicadas" ON public.cms_alliances;
CREATE POLICY "Lectura publica de alianzas activas y publicadas"
    ON public.cms_alliances
    FOR SELECT
    TO anon, authenticated
    USING (status = 'published' AND is_active = true);

DROP POLICY IF EXISTS "Lectura editorial de alianzas para Admin, DCC y RRPP" ON public.cms_alliances;
CREATE POLICY "Lectura editorial de alianzas para Admin, DCC y RRPP"
    ON public.cms_alliances
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE (cp.role IN ('admin', 'dcc') AND cp.area_scope = 'ALL')
               OR cp.area_scope = 'RRPP'
        )
    );

DROP POLICY IF EXISTS "Creacion de alianzas para Admin, DCC y RRPP" ON public.cms_alliances;
CREATE POLICY "Creacion de alianzas para Admin, DCC y RRPP"
    ON public.cms_alliances
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE (cp.role IN ('admin', 'dcc') AND cp.area_scope = 'ALL')
               OR (cp.role = 'director' AND cp.area_scope = 'RRPP')
               OR (
                   cp.role = 'delegate'
                   AND cp.area_scope = 'RRPP'
                   AND cms_alliances.status IN ('draft', 'pending_review')
               )
        )
    );

DROP POLICY IF EXISTS "Actualizacion de alianzas para Admin, DCC y RRPP" ON public.cms_alliances;
CREATE POLICY "Actualizacion de alianzas para Admin, DCC y RRPP"
    ON public.cms_alliances
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE (cp.role IN ('admin', 'dcc') AND cp.area_scope = 'ALL')
               OR (cp.role = 'director' AND cp.area_scope = 'RRPP')
               OR (
                   cp.role = 'delegate'
                   AND cp.area_scope = 'RRPP'
                   AND cms_alliances.status IN ('draft', 'pending_review')
               )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE (cp.role IN ('admin', 'dcc') AND cp.area_scope = 'ALL')
               OR (cp.role = 'director' AND cp.area_scope = 'RRPP')
               OR (
                   cp.role = 'delegate'
                   AND cp.area_scope = 'RRPP'
                   AND cms_alliances.status IN ('draft', 'pending_review')
               )
        )
    );

DROP POLICY IF EXISTS "Eliminacion de alianzas restringida a Admin global" ON public.cms_alliances;
CREATE POLICY "Eliminacion de alianzas restringida a Admin global"
    ON public.cms_alliances
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE cp.role = 'admin' AND cp.area_scope = 'ALL'
        )
    );

-- 8.4 Políticas para `cms_metrics` (Admin y DCC)
DROP POLICY IF EXISTS "Lectura publica de metricas activas y publicadas" ON public.cms_metrics;
CREATE POLICY "Lectura publica de metricas activas y publicadas"
    ON public.cms_metrics
    FOR SELECT
    TO anon, authenticated
    USING (status = 'published' AND is_active = true);

DROP POLICY IF EXISTS "Gestion editorial de metricas para Admin y DCC" ON public.cms_metrics;
CREATE POLICY "Gestion editorial de metricas para Admin y DCC"
    ON public.cms_metrics
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE cp.role IN ('admin', 'dcc') AND cp.area_scope = 'ALL'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE cp.role IN ('admin', 'dcc') AND cp.area_scope = 'ALL'
        )
    );

-- 8.5 Políticas para `cms_board_members` (Admin, DCC y Directores de su área)
DROP POLICY IF EXISTS "Lectura publica de directiva activa y publicada" ON public.cms_board_members;
CREATE POLICY "Lectura publica de directiva activa y publicada"
    ON public.cms_board_members
    FOR SELECT
    TO anon, authenticated
    USING (status = 'published' AND is_active = true);

DROP POLICY IF EXISTS "Lectura editorial de directiva segun ambito" ON public.cms_board_members;
CREATE POLICY "Lectura editorial de directiva segun ambito"
    ON public.cms_board_members
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE (cp.role IN ('admin', 'dcc') AND cp.area_scope = 'ALL')
               OR (cp.role = 'director' AND cp.area_scope = cms_board_members.area_scope)
        )
    );

DROP POLICY IF EXISTS "Creacion de directiva para Admin, DCC y Directores" ON public.cms_board_members;
CREATE POLICY "Creacion de directiva para Admin, DCC y Directores"
    ON public.cms_board_members
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE (cp.role IN ('admin', 'dcc') AND cp.area_scope = 'ALL')
               OR (
                   cp.role = 'director'
                   AND cp.area_scope = cms_board_members.area_scope
                   AND cms_board_members.member_type IN ('director', 'lead')
               )
        )
    );

DROP POLICY IF EXISTS "Actualizacion de directiva para Admin, DCC y Directores" ON public.cms_board_members;
CREATE POLICY "Actualizacion de directiva para Admin, DCC y Directores"
    ON public.cms_board_members
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE (cp.role IN ('admin', 'dcc') AND cp.area_scope = 'ALL')
               OR (
                   cp.role = 'director'
                   AND cp.area_scope = cms_board_members.area_scope
                   AND cms_board_members.member_type IN ('director', 'lead')
               )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE (cp.role IN ('admin', 'dcc') AND cp.area_scope = 'ALL')
               OR (
                   cp.role = 'director'
                   AND cp.area_scope = cms_board_members.area_scope
                   AND cms_board_members.member_type IN ('director', 'lead')
               )
        )
    );

DROP POLICY IF EXISTS "Eliminacion de directiva restringida a Admin global" ON public.cms_board_members;
CREATE POLICY "Eliminacion de directiva restringida a Admin global"
    ON public.cms_board_members
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cms_current_permission() cp
            WHERE cp.role = 'admin' AND cp.area_scope = 'ALL'
        )
    );

-- 9. Vistas SQL de Lectura Pública (`security_invoker = true`)
CREATE OR REPLACE VIEW public.cms_public_events
WITH (security_invoker = true) AS
SELECT
    id,
    slug,
    title,
    summary,
    description,
    event_date,
    end_date,
    display_date,
    time_range,
    location,
    category,
    area_scope,
    speaker,
    speaker_image_url,
    thumbnail_url,
    background_image_url,
    external_url,
    attendees_count,
    highlights,
    is_featured,
    (COALESCE(end_date, event_date) >= now()) AS is_upcoming,
    published_at
FROM public.cms_events
WHERE status = 'published'
ORDER BY is_featured DESC, event_date DESC;

CREATE OR REPLACE VIEW public.cms_public_projects
WITH (security_invoker = true) AS
SELECT
    id,
    slug,
    title,
    description,
    long_description,
    project_status,
    area_scope,
    lower(area_scope) AS area,
    faculty_badge,
    category,
    is_featured,
    thumbnail_url,
    image_position,
    screenshots,
    team,
    tech_stack,
    external_url,
    repo_url,
    display_order,
    published_at
FROM public.cms_projects
WHERE status = 'published'
ORDER BY is_featured DESC, display_order ASC, published_at DESC NULLS LAST, created_at DESC;

CREATE OR REPLACE VIEW public.cms_public_news
WITH (security_invoker = true) AS
SELECT
    n.id,
    COALESCE(NULLIF(trim(n.title), ''), e.title, p.title) AS title,
    COALESCE(NULLIF(trim(n.description), ''), e.summary, e.description, p.description) AS description,
    COALESCE(NULLIF(trim(n.image_url), ''), e.thumbnail_url, p.thumbnail_url) AS image_url,
    COALESCE(
        NULLIF(trim(n.cta_url), ''),
        NULLIF(trim(e.external_url), ''),
        NULLIF(trim(p.external_url), ''),
        CASE WHEN n.source_type = 'project' THEN '/projects' ELSE '/events' END
    ) AS cta_url,
    n.cta_label,
    n.source_type,
    n.event_id,
    n.project_id,
    n.display_order,
    n.published_at
FROM public.cms_news n
LEFT JOIN public.cms_events e
    ON e.id = n.event_id AND e.status = 'published'
LEFT JOIN public.cms_projects p
    ON p.id = n.project_id AND p.status = 'published'
WHERE n.status = 'published'
  AND n.is_active = true
  AND (
      n.source_type = 'custom'
      OR (n.source_type = 'event' AND e.id IS NOT NULL)
      OR (n.source_type = 'project' AND p.id IS NOT NULL)
  )
ORDER BY n.display_order ASC, n.published_at DESC NULLS LAST, n.created_at DESC;

CREATE OR REPLACE VIEW public.cms_public_alliances
WITH (security_invoker = true) AS
SELECT
    id,
    slug,
    name,
    logo_url,
    website_url,
    logo_scale,
    logo_brightness,
    display_order,
    published_at
FROM public.cms_alliances
WHERE status = 'published'
  AND is_active = true
ORDER BY display_order ASC, name ASC;

CREATE OR REPLACE VIEW public.cms_public_metrics
WITH (security_invoker = true) AS
SELECT
    id,
    metric_key,
    label,
    value_text,
    icon_key,
    display_order,
    published_at
FROM public.cms_metrics
WHERE status = 'published'
  AND is_active = true
ORDER BY display_order ASC, metric_key ASC;

CREATE OR REPLACE VIEW public.cms_public_board_members
WITH (security_invoker = true) AS
SELECT
    id,
    full_name,
    role_title,
    member_type,
    area_scope,
    photo_url,
    linkedin_url,
    term_period,
    display_order,
    published_at
FROM public.cms_board_members
WHERE status = 'published'
  AND is_active = true
ORDER BY
    CASE member_type
        WHEN 'president' THEN 1
        WHEN 'director'  THEN 2
        ELSE 3
    END ASC,
    area_scope ASC,
    display_order ASC,
    full_name ASC;

GRANT SELECT ON
    public.cms_public_events,
    public.cms_public_projects,
    public.cms_public_news,
    public.cms_public_alliances,
    public.cms_public_metrics,
    public.cms_public_board_members
TO anon, authenticated, service_role;
```

### Ejecución en Supabase (SQL Editor) y Semilla de Desarrollo

La migración consolidada ejecutable correspondiente a las Secciones 10 y 14 se encuentra versionada en el repositorio:

- **Migración principal:** [20261122_cms_core.sql](../supabase/migrations/20261122_cms_core.sql)
- **Datos semilla de desarrollo:** [seed_cms_dev.sql](../supabase/seed_cms_dev.sql) *(ubicado fuera de `supabase/migrations/` para no afectar producción)*

#### Pasos para aplicar en Supabase:
1. **Aplicar la migración base (`cms_*`):** Abrir **Supabase Dashboard → SQL Editor → New Query**, copiar el contenido íntegro de [20261122_cms_core.sql](../supabase/migrations/20261122_cms_core.sql) y presionar **Run**. El script es idempotente y no modifica `applicants` ni `recruitment_*`.
2. **Verificar tablas, triggers y vistas:** Confirmar en **Table Editor** la creación de las 8 tablas `cms_*` y en **Database → Views** las 6 vistas `cms_public_*` con `security_invoker = true`.
3. **Poblar datos semilla (solo Desarrollo/Staging):** Ejecutar [seed_cms_dev.sql](../supabase/seed_cms_dev.sql) en el **SQL Editor** para cargar 2 eventos de prueba (`published` y `draft`), 1 proyecto de prueba (`area_scope = 'ID'`) y las 4 métricas iniciales del Home.
4. **Asignar permisos en `cms_user_permissions`:** Crear los usuarios de prueba (`admin`, `dcc`, `director`, `delegate`) en **Authentication → Users**, consultar sus UUID en `auth.users` y ejecutar el bloque `INSERT INTO public.cms_user_permissions ... ON CONFLICT (user_id) DO NOTHING;` incluido al final de [seed_cms_dev.sql](../supabase/seed_cms_dev.sql).


