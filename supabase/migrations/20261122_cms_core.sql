-- ============================================================================
-- CMS UNICODE — MIGRACIÓN CONSOLIDADA (Entrega 1 + Entrega 2)
-- Archivo: supabase/migrations/20261122_cms_core.sql
-- Motor: PostgreSQL 15+ / Supabase
--
-- Alcance:
-- - Tipo ENUM `public.cms_content_status`
-- - Tablas `cms_user_permissions`, `cms_events`, `cms_audit_logs`,
--   `cms_projects`, `cms_news`, `cms_alliances`, `cms_metrics`, `cms_board_members`
-- - Índices de rendimiento y parciales
-- - Triggers `updated_at` y `published_at`
-- - Políticas RLS para flujo editorial dual (admin, dcc, director, delegate)
-- - 6 vistas SQL públicas con `security_invoker = true`
--
-- Nota: No modifica `public.applicants` ni ninguna tabla `public.recruitment_*`.
-- ============================================================================

-- 0. Compatibilidad para entornos PostgreSQL locales sin esquema `auth` (ej. PGlite).
--    En Supabase el esquema `auth` ya existe, por lo que este bloque no realiza cambios.
DO $$
BEGIN
    IF to_regnamespace('auth') IS NULL THEN
        CREATE SCHEMA auth;

        CREATE TABLE auth.users (
            id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
            email      text        UNIQUE,
            created_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE FUNCTION auth.uid()
        RETURNS uuid
        LANGUAGE sql
        STABLE
        AS $fn$
            SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
        $fn$;

        GRANT USAGE ON SCHEMA auth TO public, anon, authenticated, service_role;
        GRANT EXECUTE ON FUNCTION auth.uid() TO public, anon, authenticated, service_role;
    END IF;
END
$$;

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

-- 2. Tabla de permisos editoriales por usuario y área (`cms_user_permissions`)
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

-- 3. Tabla principal de Eventos y Novedades (`cms_events`)
CREATE TABLE IF NOT EXISTS public.cms_events (
    id                   uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
    slug                 varchar(160)              NOT NULL UNIQUE
                                                   CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    title                varchar(200)              NOT NULL,
    summary              text                      NULL,
    description          text                      NOT NULL,
    event_date           timestamptz               NOT NULL,
    end_date             timestamptz               NULL,
    display_date         varchar(80)               NULL,
    time_range           varchar(80)               NULL,
    location             varchar(150)              NOT NULL,
    category             varchar(60)               NOT NULL
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
    area_scope           varchar(20)               NOT NULL
                                                   CHECK (area_scope IN ('ALL', 'ID', 'ACD', 'GTH', 'RRPP', 'DCC', 'LGE', 'FIN')),
    speaker              varchar(200)              NULL,
    speaker_image_url    text                      NULL,
    thumbnail_url        text                      NOT NULL,
    background_image_url text                      NULL,
    external_url         text                      NULL,
    attendees_count      integer                   NOT NULL DEFAULT 0
                                                   CHECK (attendees_count >= 0),
    highlights           text[]                    NOT NULL DEFAULT '{}'::text[],
    is_featured          boolean                   NOT NULL DEFAULT false,
    status               public.cms_content_status NOT NULL DEFAULT 'draft',
    created_by           uuid                      NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_by          uuid                      NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    published_at         timestamptz               NULL,
    created_at           timestamptz               NOT NULL DEFAULT now(),
    updated_at           timestamptz               NOT NULL DEFAULT now(),

    CONSTRAINT chk_cms_events_date_range CHECK (
        end_date IS NULL OR end_date >= event_date
    )
);

-- 4. Tabla inmutable de trazabilidad editorial (`cms_audit_logs`)
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

-- 5. Tabla de Proyectos (`cms_projects`)
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

-- 6. Tabla de Novedades del Home (`cms_news`)
CREATE TABLE IF NOT EXISTS public.cms_news (
    id            uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
    title         varchar(200)              NULL,
    description   text                      NULL,
    image_url     text                      NULL,
    cta_url       text                      NULL,
    cta_label     varchar(60)               NOT NULL DEFAULT 'Ver detalles',
    source_type   varchar(20)               NOT NULL DEFAULT 'custom'
                                            CHECK (source_type IN ('custom', 'event', 'project')),
    event_id      uuid                      NULL REFERENCES public.cms_events(id) ON DELETE SET NULL,
    project_id    uuid                      NULL REFERENCES public.cms_projects(id) ON DELETE SET NULL,
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

-- 7. Tabla de Alianzas (`cms_alliances`)
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

-- 8. Tabla de Métricas del Home (`cms_metrics`)
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

-- 9. Tabla de Presidentes y Directores/Encargados (`cms_board_members`)
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

-- 10. Índices de rendimiento y parciales
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_board_members_active_email
    ON public.cms_board_members (email)
    WHERE email IS NOT NULL AND is_active = true;

-- 11. Funciones y Triggers automáticos (`updated_at` y `published_at`)
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
    FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();

DROP TRIGGER IF EXISTS trg_cms_events_updated_at ON public.cms_events;
CREATE TRIGGER trg_cms_events_updated_at
    BEFORE UPDATE ON public.cms_events
    FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();

DROP TRIGGER IF EXISTS trg_cms_events_published_at ON public.cms_events;
CREATE TRIGGER trg_cms_events_published_at
    BEFORE INSERT OR UPDATE ON public.cms_events
    FOR EACH ROW EXECUTE FUNCTION public.cms_sync_published_at();

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

-- 12. Función auxiliar RLS (evita recursión al evaluar permisos del usuario autenticado)
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

-- 13. Seguridad a Nivel de Fila (RLS) y Privilegios Explícitos
ALTER TABLE public.cms_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_audit_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_news             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_alliances        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_metrics          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_board_members    ENABLE ROW LEVEL SECURITY;

-- Privilegios base explícitos por rol (garantiza paridad Supabase / PostgreSQL local)
REVOKE ALL ON TABLE
    public.cms_user_permissions,
    public.cms_events,
    public.cms_audit_logs,
    public.cms_projects,
    public.cms_news,
    public.cms_alliances,
    public.cms_metrics,
    public.cms_board_members
FROM public, anon;

GRANT SELECT ON TABLE
    public.cms_events,
    public.cms_projects,
    public.cms_news,
    public.cms_alliances,
    public.cms_metrics
TO anon;

-- Proteger la columna `email` de `cms_board_members` frente a consultas REST directas con anon key
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
) ON TABLE public.cms_board_members TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    public.cms_user_permissions,
    public.cms_events,
    public.cms_projects,
    public.cms_news,
    public.cms_alliances,
    public.cms_metrics,
    public.cms_board_members
TO authenticated;

GRANT SELECT, INSERT ON TABLE public.cms_audit_logs TO authenticated;

GRANT ALL ON TABLE
    public.cms_user_permissions,
    public.cms_events,
    public.cms_audit_logs,
    public.cms_projects,
    public.cms_news,
    public.cms_alliances,
    public.cms_metrics,
    public.cms_board_members
TO service_role;

-- 13.1 Políticas para `cms_user_permissions`
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

-- 13.2 Políticas para `cms_events`
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
            WHERE (cp.role IN ('admin', 'dcc') AND cp.area_scope = 'ALL')
               OR (cp.role = 'director' AND cp.area_scope = cms_events.area_scope)
               OR (
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

-- 13.3 Políticas para `cms_audit_logs`
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

-- 13.4 Políticas para `cms_projects`
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

-- 13.5 Políticas para `cms_news`
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

-- 13.6 Políticas para `cms_alliances`
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

-- 13.7 Políticas para `cms_metrics`
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

-- 13.8 Políticas para `cms_board_members`
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

-- 14. Vistas SQL de Lectura Pública (`security_invoker = true`)
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
