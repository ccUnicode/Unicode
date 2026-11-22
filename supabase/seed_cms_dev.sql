-- ============================================================================
-- CMS UNICODE — DATOS SEMILLA PARA DESARROLLO / STAGING
-- Archivo: supabase/seed_cms_dev.sql
-- Propósito: Poblar registros iniciales de prueba de manera idempotente.
--            Mantener FUERA de `supabase/migrations/` para no ensuciar producción.
-- Prerrequisito: Haber ejecutado `supabase/migrations/20261122_cms_core.sql`.
-- ============================================================================

-- 1. Eventos de prueba (1 publicado destacado + 1 borrador de área ID)
INSERT INTO public.cms_events (
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
    status
)
VALUES
(
    'seed-tech-day-unicode-2026',
    'Tech Day UNICODE (Seed)',
    '"IA, Data y Cloud en proyectos reales de ingeniería"',
    'Jornada de prueba para validar el consumo público de eventos publicados desde cms_public_events y su visibilidad en el Home.',
    '2026-04-18T09:30:00-05:00',
    '2026-04-18T13:00:00-05:00',
    '18 Abr 2026',
    '9:30 AM – 1:00 PM',
    'Auditorio CTIC – UNI',
    'Charla',
    'ALL',
    'Arturo Ospina, Jhonatan Morgan, José Guerra',
    '/mascota/mascota-unicode-fondo-individual.webp',
    '/projects/thumbnails/techday-thumbnail.webp',
    '/convocatoria-bg.webp',
    'https://luma.com/mevizytu',
    60,
    ARRAY['IA', 'Data', 'Cloud'],
    true,
    'published'
),
(
    'seed-workshop-astro-supabase-2026',
    'Workshop Astro + Supabase CMS (Borrador)',
    '"Construyendo arquitectura SSR rápida con RLS en PostgreSQL"',
    'Evento en estado borrador para validar que cms_public_events oculta registros draft al público mientras permanece visible para DCC/ID.',
    '2026-12-05T15:00:00-05:00',
    '2026-12-05T18:00:00-05:00',
    '05 Dic 2026',
    '3:00 PM – 6:00 PM',
    'Laboratorio FIIS – UNI',
    'Workshop',
    'ID',
    'Área de Investigación y Desarrollo',
    '/mascota/mascota-unicode-fondo-individual.webp',
    '/projects/thumbnails/landingpage-thumbnail.webp',
    '/convocatoria-bg.webp',
    NULL,
    0,
    ARRAY['Astro', 'Supabase', 'TypeScript'],
    false,
    'draft'
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Proyecto de prueba (`area_scope = 'ID'`, estado `published`)
INSERT INTO public.cms_projects (
    slug,
    title,
    description,
    long_description,
    project_status,
    area_scope,
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
    status
)
VALUES
(
    'seed-cms-unicode-dev',
    'CMS Unicode (Seed)',
    'Plataforma editorial para administrar dinámicamente eventos, proyectos, métricas y convocatoria de UNICODE.',
    'Proyecto semilla para validar la vista pública cms_public_projects, los filtros por área (ID) y la estructura JSONB del equipo en project-modal.astro.',
    'Active',
    'ID',
    'ID',
    'Destacado',
    true,
    '/projects/thumbnails/landingpage-thumbnail.webp',
    'center',
    ARRAY[
        '/projects/screenshots/landingpage-screenshoot1.webp',
        '/projects/screenshots/landingpage-screenshoot2.webp'
    ],
    '[
        {
            "name": "Equipo ID UNICODE",
            "linkedin": "ccunicode",
            "image": "/mascota/mascota-unicode-fondo-individual.webp",
            "role": "Core Engineering"
        }
    ]'::jsonb,
    ARRAY['Astro', 'TypeScript', 'Tailwind CSS', 'Supabase'],
    'https://www.ccunicode.org/',
    'https://github.com/ccUnicode/Unicode',
    1,
    'published'
)
ON CONFLICT (slug) DO NOTHING;

-- 3. Cuatro métricas iniciales del Home (`cms_metrics`)
INSERT INTO public.cms_metrics (
    metric_key,
    label,
    value_text,
    icon_key,
    display_order,
    is_active,
    status
)
VALUES
    ('active_members',     'Miembros Activos',       '+70', 'members',  1, true, 'published'),
    ('completed_projects', 'Proyectos Completados',  '3',   'projects', 2, true, 'published'),
    ('events_held',        'Eventos Realizados',     '4',   'events',   3, true, 'published'),
    ('years_experience',   'Año de Trayectoria',     '1',   'years',    4, true, 'published')
ON CONFLICT (metric_key) DO NOTHING;

-- ============================================================================
-- 4. PLANTILLA PARA POBLAR `public.cms_user_permissions` (DESARROLLO)
-- ============================================================================
-- Pasos recomendados:
--   1. Crea los usuarios de prueba en Supabase Dashboard -> Authentication -> Users
--      (o invítalos por correo).
--   2. Consulta sus UUID reales en el SQL Editor ejecutando:
--        SELECT id, email FROM auth.users ORDER BY created_at DESC;
--   3. Descomenta el bloque siguiente y reemplaza cada UUID y correo real antes
--      de ejecutarlo en SQL Editor (como role postgres/service_role).
--
-- INSERT INTO public.cms_user_permissions (user_id, email, role, area_scope, is_active)
-- VALUES
--     ('00000000-0000-4000-8000-000000000001'::uuid, 'admin.dev@ccunicode.org',       'admin',    'ALL', true),
--     ('00000000-0000-4000-8000-000000000002'::uuid, 'dcc.dev@ccunicode.org',         'dcc',      'ALL', true),
--     ('00000000-0000-4000-8000-000000000003'::uuid, 'director.id.dev@ccunicode.org', 'director', 'ID',  true),
--     ('00000000-0000-4000-8000-000000000004'::uuid, 'delegado.id.dev@ccunicode.org', 'delegate', 'ID',  true)
-- ON CONFLICT (user_id) DO NOTHING;
-- ============================================================================
