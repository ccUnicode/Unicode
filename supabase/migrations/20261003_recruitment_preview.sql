-- Test mode: a secret link lets the team apply on the deployed site while the call is
-- closed to the public. Those applications are flagged and can be purged in one step.
-- Additive: run once after 20261002_recruitment.sql. No existing row is modified.
alter table public.recruitment_applications add column if not exists is_test boolean not null default false;

-- The server forwards the tester's key in the x-recruitment-preview request header;
-- PostgREST exposes request headers to SQL. Only the key's SHA-256 is stored.
create or replace function public.recruitment_preview_active() returns boolean language sql stable set search_path=public as $$
 select coalesce(
   (select settings->>'previewKeyHash' from recruitment_config) =
   encode(sha256(convert_to(nullif(current_setting('request.headers', true), '')::json->>'x-recruitment-preview', 'UTF8')), 'hex'),
   false)
$$;

create or replace function public.recruitment_assert_open() returns jsonb language plpgsql set search_path=public as $$
declare c jsonb;
begin
 select settings into c from recruitment_config where singleton for update;
 if recruitment_preview_active() then return c; end if;
 if not coalesce((c->>'enabled')::boolean,false) then raise exception 'call_closed: La convocatoria se encuentra cerrada.'; end if;
 if c->>'opensAt' is null or c->>'closesAt' is null or c->>'minAvailabilityHours' is null then raise exception 'configuration: La convocatoria aún no está configurada.'; end if;
 if now()<(c->>'opensAt')::timestamptz then raise exception 'call_not_started: La convocatoria todavía no abrió.'; end if;
 if now()>coalesce((c->>'extensionAt')::timestamptz,(c->>'closesAt')::timestamptz) then raise exception 'call_expired: El plazo de postulación terminó.'; end if;
 return c;
end $$;

create or replace function public.recruitment_mark_test() returns trigger language plpgsql set search_path=public as $$
begin new.is_test := recruitment_preview_active(); return new; end $$;
drop trigger if exists recruitment_mark_test on public.recruitment_applications;
create trigger recruitment_mark_test before insert on public.recruitment_applications for each row execute function public.recruitment_mark_test();

create or replace function public.recruitment_application_json(p_id uuid,p_history boolean default false)
returns jsonb language sql set search_path=public as $$
 select jsonb_build_object('id',a.id,'data',a.data,'questions',a.questions,'status',a.status,'video',a.video,
 'technicalFailureCount',a.technical_failure_count,'recordingAttempts',a.recording_attempts,
 'alternateAllowed',a.technical_failure_count=1 and a.recording_attempts<2 and a.video is null and a.status in ('draft','incomplete'),
 'isTest',a.is_test,'createdAt',a.created_at,'updatedAt',a.updated_at,'submittedAt',a.submitted_at) ||
 case when p_history then jsonb_build_object('history',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'fromStatus',e.from_status,'toStatus',e.to_status,'actor',e.actor,'reason',e.reason,'createdAt',e.created_at) order by e.created_at) from recruitment_events e where e.application_id=a.id),'[]'::jsonb)) else '{}'::jsonb end
 from recruitment_applications a where a.id=p_id
$$;

create or replace function public.recruitment_public_config() returns jsonb language plpgsql set search_path=public as $$
declare c jsonb; available boolean:=false; reason text;
begin
 select settings||jsonb_build_object('revision',revision) into c from recruitment_config;
 begin perform recruitment_assert_open(); available:=true; exception when others then reason:=split_part(sqlerrm,': ',2); end;
 if available and not recruitment_preview_active() and (select count(*) from recruitment_applications where submitted_at is not null)>=(c->>'maxApplicants')::integer then available:=false;reason:='Se alcanzó el máximo de postulaciones.';end if;
 return jsonb_build_object('config',c-'questions'-'thresholds'-'storageProvider'-'previewKeyHash','available',available,'reason',reason,'preview',recruitment_preview_active());
end $$;

-- Saving the configuration from the panel must not drop the test key.
create or replace function public.recruitment_update_config(p_config jsonb,p_actor text) returns jsonb language plpgsql set search_path=public as $$
declare c recruitment_config;
begin
 select * into c from recruitment_config for update;
 if (p_config->>'revision')::integer<>c.revision then raise exception 'revision_conflict: Otra sesión modificó la configuración. Recarga antes de guardar.';end if;
 if (p_config->>'maxApplicants')::integer not between 1 and 150 or (p_config->>'maxVideoSeconds')::integer<>60 or (p_config->>'questionsPerCategory')::integer<>2 then raise exception 'configuration: El máximo es 150 postulantes, 60 segundos y 2 preguntas por categoría.';end if;
 if (p_config->>'maxVideoBytes')::bigint not between 1048576 and 20971520 then raise exception 'configuration: El tamaño máximo de cada video debe estar entre 1 y 20 MiB.';end if;
 if (p_config->>'enabled')::boolean and (p_config->>'opensAt' is null or p_config->>'closesAt' is null or p_config->>'minAvailabilityHours' is null) then raise exception 'configuration: Define fechas antes de abrir.';end if;
 insert into recruitment_config_events(actor,kind,before_value,after_value) values(p_actor,'configuration',c.settings-'previewKeyHash',p_config-'revision');
 update recruitment_config set settings=(p_config-'revision'-'previewKeyHash')||case when c.settings ? 'previewKeyHash' then jsonb_build_object('previewKeyHash',c.settings->'previewKeyHash') else '{}'::jsonb end,revision=revision+1,updated_at=now();
 return jsonb_build_object('config',(select (settings-'previewKeyHash')||jsonb_build_object('revision',revision) from recruitment_config));
end $$;

create or replace function public.recruitment_admin_config() returns jsonb language sql set search_path=public as $$
 select jsonb_build_object('config',(settings-'previewKeyHash')||jsonb_build_object('revision',revision),'previewEnabled',settings ? 'previewKeyHash') from recruitment_config
$$;

create or replace function public.recruitment_set_preview_key(p_hash text,p_actor text) returns jsonb language plpgsql set search_path=public as $$
begin
 if p_hash is not null and p_hash !~ '^[0-9a-f]{64}$' then raise exception 'configuration: Clave de prueba inválida.';end if;
 update recruitment_config set settings=case when p_hash is null then settings-'previewKeyHash' else settings||jsonb_build_object('previewKeyHash',p_hash) end,updated_at=now();
 insert into recruitment_config_events(actor,kind,before_value,after_value) values(p_actor,'preview',null,jsonb_build_object('enabled',p_hash is not null));
 return jsonb_build_object('previewEnabled',p_hash is not null);
end $$;

-- Removes every test application with its history, uploads and queued email, and returns
-- the stored video files so the server can delete them from storage.
create or replace function public.recruitment_purge_tests() returns jsonb language plpgsql set search_path=public as $$
declare files jsonb; removed integer;
begin
 select coalesce(jsonb_agg(jsonb_build_object('applicationId',u.application_id,'uploadId',u.id,'provider',u.provider,'fileId',u.file_id)) filter (where u.file_id is not null),'[]'::jsonb)
 into files from recruitment_uploads u join recruitment_applications a on a.id=u.application_id where a.is_test;
 delete from recruitment_email_outbox where application_id in (select id from recruitment_applications where is_test);
 delete from recruitment_events where application_id in (select id from recruitment_applications where is_test);
 delete from recruitment_technical_failures where application_id in (select id from recruitment_applications where is_test);
 delete from recruitment_uploads where application_id in (select id from recruitment_applications where is_test);
 delete from recruitment_applications where is_test;
 get diagnostics removed = row_count;
 return jsonb_build_object('removed',removed,'files',files);
end $$;

do $$ declare item record;begin
 for item in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname like 'recruitment_%' loop
  execute format('revoke all on function %s from public',item.signature);
  if exists(select 1 from pg_roles where rolname='anon') then execute format('revoke all on function %s from anon',item.signature);end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then execute format('revoke all on function %s from authenticated',item.signature);end if;
  if exists(select 1 from pg_roles where rolname='service_role') then execute format('grant execute on function %s to service_role',item.signature);end if;
 end loop;
end $$;
