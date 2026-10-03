-- Video of up to 2 min 30 s with 45 s to read the questions first.
-- Questions stay hidden until the attempt starts; a retry after a technical failure draws new
-- questions; the file upload alternative is removed; an applicant whose attempts ran out can
-- discard the draft and fill the form again (new random questions).
-- Run once after the previous recruitment migrations.

create or replace function public.recruitment_pick_questions(c jsonb) returns jsonb language plpgsql volatile set search_path=public as $$
declare questions jsonb;
begin
 select jsonb_agg(q order by q->>'category',q->>'id') into questions from (
   (select item-'enabled' as q from jsonb_array_elements(c->'questions') item where item->>'category'='motivation' and coalesce((item->>'enabled')::boolean,true) order by random() limit 2)
   union all
   (select item-'enabled' as q from jsonb_array_elements(c->'questions') item where item->>'category'='collaboration' and coalesce((item->>'enabled')::boolean,true) order by random() limit 2)
 ) assigned;
 if coalesce(jsonb_array_length(questions),0)<>4 then raise exception 'configuration: Faltan preguntas habilitadas en el banco.';end if;
 return questions;
end $$;

-- The applicant only sees their questions once an attempt has started; the admin always does.
create or replace function public.recruitment_application_json(p_id uuid,p_history boolean default false)
returns jsonb language sql set search_path=public as $$
 select jsonb_build_object('id',a.id,'data',a.data,
 'questions',case when p_history or a.video is not null or a.recording_attempts>a.technical_failure_count then a.questions else '[]'::jsonb end,
 'status',a.status,'video',a.video,
 'technicalFailureCount',a.technical_failure_count,'recordingAttempts',a.recording_attempts,
 'alternateAllowed',false,
 'isTest',a.is_test,'createdAt',a.created_at,'updatedAt',a.updated_at,'submittedAt',a.submitted_at) ||
 case when p_history then jsonb_build_object('history',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'fromStatus',e.from_status,'toStatus',e.to_status,'actor',e.actor,'reason',e.reason,'createdAt',e.created_at) order by e.created_at) from recruitment_events e where e.application_id=a.id),'[]'::jsonb)) else '{}'::jsonb end
 from recruitment_applications a where a.id=p_id
$$;

-- One retry per application, with new questions: the failed attempt already showed the old ones.
create or replace function public.recruitment_technical_failure(p_id uuid,p_token_hash text,p_code text,p_message text) returns jsonb language plpgsql set search_path=public as $$
declare a recruitment_applications; c jsonb;
begin
 c:=recruitment_assert_open();a:=recruitment_require_owner(p_id,p_token_hash);
 if a.status not in ('draft','incomplete') or a.video is not null then raise exception 'immutable: No puedes reemplazar un video validado.';end if;
 if a.technical_failure_count>=1 then raise exception 'attempts_exhausted: Ya utilizaste el reintento. Puedes empezar de nuevo con el formulario.';end if;
 if a.recording_attempts=0 and (select count(*) from recruitment_applications where recording_attempts>0)>=(c->>'maxApplicants')::integer then raise exception 'capacity: Se alcanzó el máximo de postulantes con video iniciado.';end if;
 insert into recruitment_technical_failures(application_id,code,message) values(p_id,left(p_code,80),left(p_message,500));
 update recruitment_applications set technical_failure_count=1,recording_attempts=greatest(recording_attempts,1),questions=recruitment_pick_questions(c),updated_at=now() where id=p_id;
 update recruitment_uploads set status='failed' where application_id=p_id and status in ('reserved','pending');
 insert into recruitment_events(application_id,from_status,to_status,actor,reason) values(p_id,a.status,a.status,'postulante','Falla técnica registrada; nuevas preguntas para el reintento.');
 return jsonb_build_object('application',recruitment_application_json(p_id));
end $$;

-- Only recordings made on the site; the duration limit comes from the configuration.
create or replace function public.recruitment_begin_upload(p_id uuid,p_token_hash text,p_upload_id uuid,p_mode text,p_content_type text,p_bytes bigint)
returns jsonb language plpgsql set search_path=public as $$
declare a recruitment_applications; c jsonb; u recruitment_uploads;
begin
 c:=recruitment_assert_open();a:=recruitment_require_owner(p_id,p_token_hash);
 if a.status not in ('draft','incomplete') or a.video is not null then raise exception 'immutable: El video ya fue confirmado.';end if;
 if p_mode<>'recording' then raise exception 'alternate_not_allowed: Solo se aceptan videos grabados en la web.';end if;
 if p_content_type not in ('video/mp4','video/webm') or p_bytes<1 or p_bytes>(c->>'maxVideoBytes')::bigint then raise exception 'invalid_video: El formato o tamaño del video no está permitido.';end if;
 select * into u from recruitment_uploads where application_id=p_id and status in ('reserved','pending') for update;
 if found then
   if u.expires_at<now() then
     update recruitment_uploads set expires_at=now()+interval '2 hours',upload_authorization=null where id=u.id returning * into u;
   end if;
   if u.mode<>p_mode or u.content_type<>p_content_type or u.expected_bytes<>p_bytes then raise exception 'upload_pending: Ya existe una carga pendiente para otro archivo.';end if;
   if u.status='reserved' and u.created_at>now()-interval '30 seconds' then raise exception 'upload_in_progress: La autorización de carga aún se está preparando. Vuelve a intentar en unos segundos.';end if;
   return jsonb_build_object('upload',jsonb_build_object('id',u.id,'provider',u.provider,'fileId',u.file_id,'mode',u.mode,'contentType',u.content_type,'expectedBytes',u.expected_bytes,'maxBytes',u.max_bytes,'maxSeconds',u.max_seconds,'status',u.status,'authorization',u.upload_authorization));
 end if;
 if a.recording_attempts<=a.technical_failure_count or a.recording_attempts<1 or exists(select 1 from recruitment_uploads where application_id=p_id and attempt_no=a.recording_attempts) then raise exception 'recording_required: Inicia primero un intento de grabación válido en la web.';end if;
 insert into recruitment_uploads(id,application_id,provider,mode,content_type,expected_bytes,max_bytes,max_seconds,attempt_no)
 values(p_upload_id,p_id,c->>'storageProvider',p_mode,p_content_type,p_bytes,(c->>'maxVideoBytes')::bigint,(c->>'maxVideoSeconds')::integer,a.recording_attempts) returning * into u;
 return jsonb_build_object('upload',jsonb_build_object('id',u.id,'provider',u.provider,'fileId',u.file_id,'mode',u.mode,'contentType',u.content_type,'expectedBytes',u.expected_bytes,'maxBytes',u.max_bytes,'maxSeconds',u.max_seconds,'status',u.status));
end $$;

-- Deletes an unfinished draft so the applicant can fill the form again. Returns the stored
-- files so the server can remove them from storage.
create or replace function public.recruitment_discard_draft(p_id uuid,p_token_hash text) returns jsonb language plpgsql set search_path=public as $$
declare a recruitment_applications; files jsonb;
begin
 perform recruitment_assert_open();a:=recruitment_require_owner(p_id,p_token_hash);
 if a.submitted_at is not null or a.video is not null or a.status not in ('draft','incomplete') then raise exception 'immutable: Esta postulación ya no puede descartarse.';end if;
 select coalesce(jsonb_agg(jsonb_build_object('applicationId',u.application_id,'uploadId',u.id,'provider',u.provider,'fileId',u.file_id)) filter (where u.file_id is not null),'[]'::jsonb) into files from recruitment_uploads u where u.application_id=p_id;
 delete from recruitment_email_outbox where application_id=p_id;
 delete from recruitment_events where application_id=p_id;
 delete from recruitment_technical_failures where application_id=p_id;
 delete from recruitment_uploads where application_id=p_id;
 delete from recruitment_applications where id=p_id;
 return jsonb_build_object('discarded',true,'files',files);
end $$;

create or replace function public.recruitment_update_config(p_config jsonb,p_actor text) returns jsonb language plpgsql set search_path=public as $$
declare c recruitment_config;
begin
 select * into c from recruitment_config where singleton for update;
 if (p_config->>'revision')::integer<>c.revision then raise exception 'revision_conflict: Otra sesión modificó la configuración. Recarga antes de guardar.';end if;
 if (p_config->>'maxApplicants')::integer not between 1 and 150 or (p_config->>'maxVideoSeconds')::integer<>150 or (p_config->>'questionsPerCategory')::integer<>2 then raise exception 'configuration: El máximo es 150 postulantes, 2 min 30 s de video y 2 preguntas por categoría.';end if;
 if (p_config->>'maxVideoBytes')::bigint not between 1048576 and 52428800 then raise exception 'configuration: El tamaño máximo de cada video debe estar entre 1 y 50 MiB.';end if;
 if (p_config->>'enabled')::boolean and (p_config->>'opensAt' is null or p_config->>'closesAt' is null or p_config->>'minAvailabilityHours' is null) then raise exception 'configuration: Define fechas antes de abrir.';end if;
 insert into recruitment_config_events(actor,kind,before_value,after_value) values(p_actor,'configuration',c.settings-'previewKeyHash',p_config-'revision');
 update recruitment_config set settings=(p_config-'revision'-'previewKeyHash')||case when c.settings ? 'previewKeyHash' then jsonb_build_object('previewKeyHash',c.settings->'previewKeyHash') else '{}'::jsonb end,revision=revision+1,updated_at=now() where singleton;
 return jsonb_build_object('config',(select (settings-'previewKeyHash')||jsonb_build_object('revision',revision) from recruitment_config));
end $$;

-- 2 min 30 s, 45 s to prepare, and room for the larger file (about 25 MB at the recorder's bitrate).
update public.recruitment_config
 set settings=settings||'{"maxVideoSeconds":150,"preparationSeconds":45,"maxVideoBytes":41943040}'::jsonb,revision=revision+1,updated_at=now()
 where singleton;

do $$ declare f text; begin
 foreach f in array array['public.recruitment_pick_questions(jsonb)','public.recruitment_application_json(uuid,boolean)','public.recruitment_technical_failure(uuid,text,text,text)','public.recruitment_begin_upload(uuid,text,uuid,text,text,bigint)','public.recruitment_discard_draft(uuid,text)','public.recruitment_update_config(jsonb,text)'] loop
  execute format('revoke all on function %s from public',f);
  if exists(select 1 from pg_roles where rolname='anon') then execute format('revoke all on function %s from anon',f); end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then execute format('revoke all on function %s from authenticated',f); end if;
  if exists(select 1 from pg_roles where rolname='service_role') then execute format('grant execute on function %s to service_role',f); end if;
 end loop;
end $$;
