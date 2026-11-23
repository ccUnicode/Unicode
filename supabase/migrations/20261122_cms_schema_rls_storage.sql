-- ============================================================================
-- Migración: CMS Unicode - Esquema, Modelo RBAC, Políticas RLS y Storage Buckets
-- Fecha: 2026-11-22
-- ============================================================================

-- 1. Soporte para entorno de pruebas y autenticación (auth.users y auth.uid)
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- 2. Creación de tipos enumerados del CMS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cms_role_type') THEN
    CREATE TYPE cms_role_type AS ENUM ('admin', 'editor_global', 'director', 'delegado');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'unicode_area_type') THEN
    CREATE TYPE unicode_area_type AS ENUM ('ALL', 'ID', 'RRPP', 'GTH', 'ACD', 'DCC', 'LGE', 'FIN');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cms_content_status_type') THEN
    CREATE TYPE cms_content_status_type AS ENUM ('draft', 'pending_review', 'published', 'archived');
  END IF;
END $$;

-- 3. Tabla central de permisos RBAC del CMS
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

CREATE INDEX IF NOT EXISTS idx_cms_user_permissions_lookup 
ON public.cms_user_permissions(user_id, area_scope, can_publish);

ALTER TABLE public.cms_user_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas sobre cms_user_permissions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cms_user_permissions' AND policyname = 'Users can read own permissions') THEN
    CREATE POLICY "Users can read own permissions"
    ON public.cms_user_permissions
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
  END IF;
END $$;

-- 4. Funciones Helper SQL para RLS
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
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;

    SELECT role, area_scope INTO user_perm
    FROM public.cms_user_permissions
    WHERE user_id = auth.uid();

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    IF user_perm.area_scope = 'ALL' THEN
        RETURN true;
    END IF;

    RETURN user_perm.area_scope = target_area;
END;
$$;

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

    IF (user_perm.area_scope = 'ALL' OR user_perm.area_scope = target_area) AND user_perm.can_publish = true THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.has_area_access(unicode_area_type) FROM public;
REVOKE ALL ON FUNCTION public.can_publish_content(unicode_area_type) FROM public;
GRANT EXECUTE ON FUNCTION public.has_area_access(unicode_area_type) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_publish_content(unicode_area_type) TO authenticated, service_role;

-- 5. Sincronización automática de Directores desde recruitment_directors
CREATE OR REPLACE FUNCTION public.sync_director_to_cms(p_user_id UUID, p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    d recruitment_directors;
BEGIN
    SELECT * INTO d FROM recruitment_directors WHERE email = lower(trim(p_email));
    IF NOT FOUND THEN
        RETURN jsonb_build_object('synced', false, 'reason', 'No existe en recruitment_directors');
    END IF;

    -- Asegurar existencia en auth.users si no está registrado
    INSERT INTO auth.users (id, email) VALUES (p_user_id, d.email) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.cms_user_permissions(user_id, email, role, area_scope, can_publish)
    VALUES(p_user_id, d.email, 'director', d.area::unicode_area_type, true)
    ON CONFLICT (user_id) DO UPDATE SET
        email = excluded.email,
        role = 'director',
        area_scope = excluded.area_scope,
        can_publish = true,
        updated_at = now();

    RETURN jsonb_build_object('synced', true, 'area', d.area, 'email', d.email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_director_to_cms(UUID, TEXT) TO authenticated, service_role;

-- 6. Tablas de Contenido del CMS (cms_events y cms_projects)
CREATE TABLE IF NOT EXISTS public.cms_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    description TEXT NOT NULL DEFAULT '',
    area unicode_area_type NOT NULL CHECK (area <> 'ALL'),
    status cms_content_status_type NOT NULL DEFAULT 'draft',
    image_url TEXT,
    event_date TIMESTAMPTZ,
    location TEXT DEFAULT '',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cms_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    description TEXT NOT NULL DEFAULT '',
    area unicode_area_type NOT NULL CHECK (area <> 'ALL'),
    status cms_content_status_type NOT NULL DEFAULT 'draft',
    image_url TEXT,
    project_url TEXT DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cms_events_area_status ON public.cms_events(area, status);
CREATE INDEX IF NOT EXISTS idx_cms_projects_area_status ON public.cms_projects(area, status);

-- 7. Trigger de control de transiciones y protección de contenido publicado
CREATE OR REPLACE FUNCTION public.check_cms_content_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_publisher BOOLEAN;
BEGIN
    is_publisher := public.can_publish_content(OLD.area);

    -- Si no es publicador e intenta alterar una fila publicada manteniéndola en 'published'
    IF NOT is_publisher AND OLD.status = 'published' AND NEW.status = 'published' THEN
        RAISE EXCEPTION 'Operación denegada: Un Delegado no puede modificar directamente contenido publicado sin regresarlo a estado pending_review.';
    END IF;

    -- Si no es publicador e intenta elevar el estado a 'published'
    IF NOT is_publisher AND NEW.status = 'published' THEN
        RAISE EXCEPTION 'Operación denegada: No cuentas con permisos de publicación para el área %.', OLD.area;
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_cms_events_transition ON public.cms_events;
CREATE TRIGGER trg_check_cms_events_transition
BEFORE UPDATE ON public.cms_events
FOR EACH ROW
EXECUTE FUNCTION public.check_cms_content_transition();

DROP TRIGGER IF EXISTS trg_check_cms_projects_transition ON public.cms_projects;
CREATE TRIGGER trg_check_cms_projects_transition
BEFORE UPDATE ON public.cms_projects
FOR EACH ROW
EXECUTE FUNCTION public.check_cms_content_transition();

-- 8. Habilitación de RLS y Políticas de Seguridad en Tablas cms_*
ALTER TABLE public.cms_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cms_projects FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN 
    GRANT SELECT ON public.cms_events, public.cms_projects TO anon; 
  END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN 
    GRANT ALL ON public.cms_events, public.cms_projects TO authenticated; 
  END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN 
    GRANT ALL ON public.cms_events, public.cms_projects TO service_role; 
  END IF;
END $$;

-- Políticas para cms_events
DROP POLICY IF EXISTS "cms_events_select_policy" ON public.cms_events;
CREATE POLICY "cms_events_select_policy" ON public.cms_events
FOR SELECT TO public
USING (
  status = 'published'
  OR (auth.uid() IS NOT NULL AND public.has_area_access(area))
);

DROP POLICY IF EXISTS "cms_events_insert_policy" ON public.cms_events;
CREATE POLICY "cms_events_insert_policy" ON public.cms_events
FOR INSERT TO authenticated
WITH CHECK (
  public.has_area_access(area)
  AND (
    public.can_publish_content(area)
    OR status IN ('draft', 'pending_review')
  )
);

DROP POLICY IF EXISTS "cms_events_update_policy" ON public.cms_events;
CREATE POLICY "cms_events_update_policy" ON public.cms_events
FOR UPDATE TO authenticated
USING (
  public.has_area_access(area)
  AND (
    public.can_publish_content(area)
    OR status IN ('draft', 'pending_review', 'published')
  )
)
WITH CHECK (
  public.has_area_access(area)
  AND (
    public.can_publish_content(area)
    OR status IN ('draft', 'pending_review')
  )
);

DROP POLICY IF EXISTS "cms_events_delete_policy" ON public.cms_events;
CREATE POLICY "cms_events_delete_policy" ON public.cms_events
FOR DELETE TO authenticated
USING (
  public.can_publish_content(area)
);

-- Políticas para cms_projects
DROP POLICY IF EXISTS "cms_projects_select_policy" ON public.cms_projects;
CREATE POLICY "cms_projects_select_policy" ON public.cms_projects
FOR SELECT TO public
USING (
  status = 'published'
  OR (auth.uid() IS NOT NULL AND public.has_area_access(area))
);

DROP POLICY IF EXISTS "cms_projects_insert_policy" ON public.cms_projects;
CREATE POLICY "cms_projects_insert_policy" ON public.cms_projects
FOR INSERT TO authenticated
WITH CHECK (
  public.has_area_access(area)
  AND (
    public.can_publish_content(area)
    OR status IN ('draft', 'pending_review')
  )
);

DROP POLICY IF EXISTS "cms_projects_update_policy" ON public.cms_projects;
CREATE POLICY "cms_projects_update_policy" ON public.cms_projects
FOR UPDATE TO authenticated
USING (
  public.has_area_access(area)
  AND (
    public.can_publish_content(area)
    OR status IN ('draft', 'pending_review', 'published')
  )
)
WITH CHECK (
  public.has_area_access(area)
  AND (
    public.can_publish_content(area)
    OR status IN ('draft', 'pending_review')
  )
);

DROP POLICY IF EXISTS "cms_projects_delete_policy" ON public.cms_projects;
CREATE POLICY "cms_projects_delete_policy" ON public.cms_projects
FOR DELETE TO authenticated
USING (
  public.can_publish_content(area)
);

-- 9. Creación y Configuración de Buckets de Supabase Storage
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  public BOOLEAN DEFAULT false,
  avif_autodetection BOOLEAN DEFAULT false,
  file_size_limit BIGINT,
  allowed_mime_types TEXT[],
  owner_id TEXT
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id TEXT REFERENCES storage.buckets(id),
  name TEXT,
  owner UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN 
    GRANT SELECT ON storage.buckets, storage.objects TO anon; 
  END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN 
    GRANT ALL ON storage.buckets, storage.objects TO authenticated; 
  END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN 
    GRANT ALL ON storage.buckets, storage.objects TO service_role; 
  END IF;
END $$;

-- Registro de los 4 Buckets del CMS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('events-media', 'events-media', true, 5242880, ARRAY['image/webp', 'image/png']),
  ('projects-media', 'projects-media', true, 5242880, ARRAY['image/webp', 'image/png']),
  ('alliances-logos', 'alliances-logos', true, 2097152, ARRAY['image/webp', 'image/png']),
  ('institutional-media', 'institutional-media', true, 5242880, ARRAY['image/webp', 'image/png'])
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Políticas de Seguridad RLS en storage.objects
DROP POLICY IF EXISTS "Public can view published media" ON storage.objects;
CREATE POLICY "Public can view published media"
ON storage.objects FOR SELECT TO public
USING (bucket_id IN ('events-media', 'projects-media', 'alliances-logos', 'institutional-media'));

DROP POLICY IF EXISTS "Authenticated CMS users can upload media" ON storage.objects;
CREATE POLICY "Authenticated CMS users can upload media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('events-media', 'projects-media', 'alliances-logos', 'institutional-media')
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cms_user_permissions
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Publishers and admins can update or delete media" ON storage.objects;
CREATE POLICY "Publishers and admins can update or delete media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id IN ('events-media', 'projects-media', 'alliances-logos', 'institutional-media')
  AND EXISTS (
    SELECT 1 FROM public.cms_user_permissions
    WHERE user_id = auth.uid() AND (can_publish = true OR role = 'admin')
  )
);

DROP POLICY IF EXISTS "Publishers and admins can delete media" ON storage.objects;
CREATE POLICY "Publishers and admins can delete media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('events-media', 'projects-media', 'alliances-logos', 'institutional-media')
  AND EXISTS (
    SELECT 1 FROM public.cms_user_permissions
    WHERE user_id = auth.uid() AND (can_publish = true OR role = 'admin')
  )
);
